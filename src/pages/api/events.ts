import type { APIRoute } from "astro";
import { bus, RESULTS_CHANGED } from "../../lib/events";

// Server-sent events: a long-lived response the browser reads with
// `new EventSource("/api/events")`. A logged-in user's connection hears
// "changed" whenever their results change elsewhere (staff releasing marks,
// or their own edits in another tab or on their phone), so the page can
// offer a refresh. Anonymous connections only get
// the heartbeat — which is also what the post-deploy CI probe checks for.
export const GET: APIRoute = ({ locals }) => {
  const uniId = locals.user?.uniId ?? null;
  let onChange: (id: string) => void;
  let heartbeat: ReturnType<typeof setInterval>;

  const stream = new ReadableStream<string>({
    start(controller) {
      // an opening comment so the client (and CI) sees bytes immediately,
      // and a periodic one so proxies don't drop the connection as idle
      controller.enqueue(": connected\n\n");
      heartbeat = setInterval(() => controller.enqueue(": ping\n\n"), 30_000);
      onChange = (id) => {
        if (id === uniId) controller.enqueue(`event: changed\ndata: {}\n\n`);
      };
      if (uniId !== null) bus.on(RESULTS_CHANGED, onChange);
    },
    cancel() {
      clearInterval(heartbeat);
      bus.off(RESULTS_CHANGED, onChange);
    },
  });

  return new Response(stream.pipeThrough(new TextEncoderStream()), {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
    },
  });
};
