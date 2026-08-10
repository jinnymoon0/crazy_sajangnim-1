import posthog from "posthog-js";

const projectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

if (!projectToken || !host) {
  if (process.env.NODE_ENV === "development") {
    const missingVariable = !projectToken
      ? "NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN"
      : "NEXT_PUBLIC_POSTHOG_HOST";

    throw new Error(
      `${missingVariable} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${missingVariable} is configured`,
    );
  }
} else {
  posthog.init(projectToken, {
    api_host: host,
    defaults: "2026-01-30",
    capture_exceptions: true,
    tracing_headers:
      typeof window === "undefined" ? [] : [window.location.hostname],
    debug: process.env.NODE_ENV === "development",

    /*
     * Record every session, signed in or not. Recording starts as soon
     * as the library initialises, so a visitor who never signs in is
     * captured from their first page — which is most of the traffic and
     * the part nothing else could show.
     */
    disable_session_recording: false,

    session_recording: {
      /*
       * Nothing anyone types is ever recorded. This covers the comment
       * box, the blog editor, the username picker and the contact form
       * alike, and it covers any field added later — the default is to
       * mask, so a new input is safe before anyone remembers it exists.
       */
      maskAllInputs: true,

      /*
       * Ordinary page text is deliberately left visible, which is what
       * happens when maskTextSelector is not set. A recording where
       * every word is a grey block shows that a person clicked
       * something, not what they were looking at, which is the entire
       * reason to watch one. Sensitive text is excluded by marking the
       * element, below, rather than by blanking the page.
       */
      maskTextSelector: null,

      /*
       * Elements marked as sensitive are not recorded at all — not
       * their content, not their shape. `ph-no-capture` is PostHog's
       * own convention; the data attribute is here because a class can
       * be dropped by a refactor of styling, and this cannot.
       */
      blockClass: "ph-no-capture",
      blockSelector: "[data-ph-no-capture]",

      /*
       * Network requests are recorded as timings only. Bodies would
       * carry exactly what the masking above exists to keep out: a
       * comment on its way to the API, a session payload, an address.
       */
      recordHeaders: false,
      recordBody: false,

      /*
       * Belt and braces. Even with the two flags above, anything the
       * library still considers capturable about a request is dropped
       * here rather than trusted to default behaviour.
       */
      maskCapturedNetworkRequestFn: (request) => {
        request.requestBody = null;
        request.responseBody = null;
        request.requestHeaders = {};
        request.responseHeaders = {};

        return request;
      },
    },

    /* Timings are useful; payloads are not worth the risk. */
    capture_performance: {
      network_timing: true,
    },
  });
}
