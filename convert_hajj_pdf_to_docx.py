from pathlib import Path
from io import BytesIO

import pypdfium2 as pdfium
from pypdf import PdfReader
from pypdf._cmap import _parse_to_unicode
from pypdf.generic import ContentStream, TextStringObject, ByteStringObject
from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.section import WD_SECTION
from docx.shared import Cm, Pt
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

SRC = Path(r"C:\Users\Lenovo\Downloads\خطة تكثيف الاعمال لموسم حج 1447هـ.pdf")
OUT = Path(r"C:\Users\Lenovo\.gemini\antigravity\scratch\hotel-reservation-system\خطة تكثيف الاعمال لموسم حج 1447هـ.docx")


def set_rtl(paragraph):
    paragraph.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    ppr = paragraph._p.get_or_add_pPr()
    bidi = OxmlElement("w:bidi")
    bidi.set(qn("w:val"), "1")
    ppr.append(bidi)


def extracted_text(page, reader):
    # The source's Arabic glyph order is visual (right-to-left) rather than
    # logical. Its embedded ToUnicode maps let us recover Unicode text.
    resources = page["/Resources"]
    fonts = resources.get("/Font", {})
    cmaps = {}
    for key, font_ref in fonts.items():
        font = font_ref.get_object()
        if "/ToUnicode" in font:
            cmap, _ = _parse_to_unicode(font)
            cmaps[str(key)] = cmap

    stream = ContentStream(page.get_contents(), reader)
    current_font = None
    chunks = []

    def decode(obj):
        if current_font not in cmaps:
            return ""
        raw = getattr(obj, "original_bytes", None)
        if raw is None:
            raw = bytes(obj)
        cmap = cmaps[current_font]
        # Composite Arabic fonts use two-byte character ids.
        if len(raw) % 2 == 0:
            return "".join(cmap.get(chr(int.from_bytes(raw[i:i + 2], "big")), "") for i in range(0, len(raw), 2))
        return "".join(cmap.get(chr(b), "") for b in raw)

    for operands, op in stream.operations:
        if op == b"Tf":
            current_font = str(operands[0])
        elif op == b"Tj":
            chunks.append(decode(operands[0]))
        elif op == b"TJ":
            for item in operands[0]:
                if isinstance(item, (TextStringObject, ByteStringObject)):
                    chunks.append(decode(item))

    # PDF paints Arabic characters from right to left; reverse the recovered
    # visual stream to restore ordinary editable Unicode text.
    return "".join(chunks)[::-1].strip()


def main():
    reader = PdfReader(str(SRC))
    rendered = pdfium.PdfDocument(str(SRC))
    doc = Document()
    sec = doc.sections[0]
    sec.page_width, sec.page_height = Cm(21), Cm(29.7)
    sec.top_margin = sec.bottom_margin = Cm(0.45)
    sec.left_margin = sec.right_margin = Cm(0.45)

    # Faithful visual pages, preserving all source fonts and layout.
    for i in range(len(reader.pages)):
        page = rendered[i]
        bitmap = page.render(scale=2.2)
        image = bitmap.to_pil()
        buf = BytesIO()
        image.save(buf, format="PNG")
        buf.seek(0)
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_after = Pt(0)
        p.add_run().add_picture(buf, width=Cm(20.05), height=Cm(28.35))
        if i != len(reader.pages) - 1:
            doc.add_page_break()

    doc.add_section(WD_SECTION.NEW_PAGE)
    heading = doc.add_paragraph()
    set_rtl(heading)
    run = heading.add_run("النص القابل للتحرير")
    run.bold = True
    run.font.name = "Calibri"
    run.font.size = Pt(18)

    for i, page in enumerate(reader.pages, 1):
        label = doc.add_paragraph()
        set_rtl(label)
        r = label.add_run(f"الصفحة {i}")
        r.bold = True
        r.font.name = "Calibri"
        r.font.size = Pt(14)
        text = extracted_text(page, reader)
        p = doc.add_paragraph()
        set_rtl(p)
        p.paragraph_format.space_after = Pt(8)
        r = p.add_run(text if text else "[تعذر استخراج النص من هذه الصفحة]")
        r.font.name = "Calibri"
        r.font.size = Pt(12)

    doc.core_properties.title = "خطة تكثيف الاعمال لموسم حج 1447هـ"
    doc.save(OUT)
    print(OUT)


if __name__ == "__main__":
    main()
