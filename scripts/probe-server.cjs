const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(process.cwd(), "dist");
const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".png": "image/png" };
http.createServer((req, res) => {
  const url = req.url.split("?")[0];
  const file = path.join(root, url === "/" ? "index.html" : url);
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end("not found"); return; }
    res.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream" });
    res.end(data);
  });
}).listen(4180, "0.0.0.0", () => console.log("probe server on 4180"));
