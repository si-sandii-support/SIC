import { Router } from "express";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);
export const renderRouter = Router();

// Render Office files with LibreOffice so the browser can use the actual Office
// page/slide pixels as the visual source. The parser still keeps a structured
// model for selectable text/images as a fallback when the renderer is absent.
renderRouter.post("/pptx", async (req, res, next) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "sic-pptx-"));
  const input = path.join(dir, "source.pptx");
  try {
    const body = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || "");
    if (!body.length) return res.status(400).json({ error: "PPTX payload is empty." });
    await fs.writeFile(input, body);
    await exec("libreoffice", ["--headless", "--convert-to", "pdf:impress_pdf_Export", "--outdir", dir, input], { timeout: 120000 });
    const pdf = path.join(dir, "source.pdf");
    await fs.access(pdf);
    await exec("pdftoppm", ["-png", "-r", "120", pdf, path.join(dir, "slide")], { timeout: 120000 });
    const names = (await fs.readdir(dir)).filter((n) => /^slide-\d+\.png$/i.test(n)).sort((a,b) => Number(a.match(/(\d+)/)?.[1]) - Number(b.match(/(\d+)/)?.[1]));
    const slides = await Promise.all(names.map(async (name) => ({ name, dataUrl: `data:image/png;base64,${(await fs.readFile(path.join(dir, name))).toString("base64")}` })));
    res.json({ slides });
  } catch (error) {
    // Rendering is an enhancement; the client can fall back to XML parsing.
    console.error("SIC PPTX renderer failed:", error);
    res.status(503).json({ error: "Office slide rendering is temporarily unavailable. You can continue with structured extraction." });
  } finally {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
});
