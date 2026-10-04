"""Brand asset regressions."""
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class BrandAssetTests(unittest.TestCase):
    def test_brand_mark_is_valid_svg(self):
        root = ET.parse(ROOT / "static" / "brand-mark.svg").getroot()
        self.assertEqual(root.tag, "{http://www.w3.org/2000/svg}svg")
        self.assertEqual(root.attrib["viewBox"], "0 0 48 48")

    def test_page_uses_mark_for_header_and_favicon(self):
        page = (ROOT / "templates" / "index.html").read_text()
        self.assertIn('rel="icon" href="/static/brand-mark.svg?v=1"', page)
        self.assertIn('class="brand-mark" src="/static/brand-mark.svg?v=1"', page)


if __name__ == "__main__":
    unittest.main()
