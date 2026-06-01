import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from "@azure/functions";
import { routeRequest } from "../http/router.js";

async function httpApi(
  req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  return routeRequest(req, context);
}

app.http("api", {
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  authLevel: "anonymous",
  route: "{*route}",
  handler: httpApi,
});
