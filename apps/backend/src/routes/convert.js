import { Router } from "express";
import { buildPdf } from "../services/pdf.js";
import { buildDocx } from "../services/docx.js";
import { buildPptx } from "../services/pptx.js";
import { buildXlsx } from "../services/xlsx.js";
export const convertRouter = Router();
convertRouter.post("/", async (req, res, next) => { try {
    const b = req.body;
    if (!b?.blocks?.length)
        return res.status(400).json({ error: "Selected content is empty." });
    let r;
    const layout = b.layout === "horizontal" ? "horizontal" : "vertical";
    if (b.format === "pdf")
        r = await buildPdf(b.blocks, b.title, layout);
    else if (b.format === "docx")
        r = await buildDocx(b.blocks, b.title, layout);
    else if (b.format === "pptx")
        r = await buildPptx(b.blocks, b.title, layout);
    else if (b.format === "xlsx")
        r = await buildXlsx(b.blocks, b.title, layout);
    else
        return res.status(400).json({ error: "Unsupported format." });
    res.json({ ...r, base64: r.buffer.toString("base64") });
}
catch (e) {
    next(e);
} });
