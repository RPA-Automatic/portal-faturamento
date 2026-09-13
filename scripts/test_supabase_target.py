import unittest
from supabase_target import validate_target


class TargetTests(unittest.TestCase):
    def test_dev_unprovisioned_blocks(self):
        with self.assertRaises(ValueError):
            validate_target("https://lvsocwetuhhqxlwyfdrw.supabase.co")

    def test_production_requires_confirmation(self):
        with self.assertRaises(ValueError):
            validate_target("https://eukazzizamxratkavcap.supabase.co", "prod")

    def test_explicit_correct_production(self):
        self.assertEqual(validate_target("https://eukazzizamxratkavcap.supabase.co/", "prod", True),
                         "https://eukazzizamxratkavcap.supabase.co")

    def test_wrong_or_ambiguous_destinations_block(self):
        for url in ("https://lvsocwetuhhqxlwyfdrw.supabase.co", "http://eukazzizamxratkavcap.supabase.co",
                    "https://eukazzizamxratkavcap.supabase.co.evil.test", "https://eukazzizamxratkavcap.supabase.co/rest/v1",
                    "https://user@eukazzizamxratkavcap.supabase.co", "https://eukazzizamxratkavcap.supabase.co?x=1"):
            with self.subTest(url=url), self.assertRaises(ValueError):
                validate_target(url, "prod", True)


if __name__ == "__main__":
    unittest.main()
