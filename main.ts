// server.ts

import { serve } from "https://deno.land/std/http/server.ts";

const targetUrl = "https://generativelanguage.googleapis.com";

const server = serve({ port: 80 });
console.log("Server is running at http://localhost:8000/");

for await (const req of server) {
  try {
    const targetResponse = await fetch(targetUrl + req.url);
    const body = new Uint8Array(await targetResponse.arrayBuffer());
    
    req.respond({ body });
  } catch (error) {
    req.respond({ status: 500, body: "Internal Server Error" });
  }
}
