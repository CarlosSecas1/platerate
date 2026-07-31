import unittest
from app import estimate


class EstimateTests(unittest.TestCase):
    def test_baseline_range_is_ordered(self):
        result = estimate({"followers": 50_000, "engagementRate": 4, "deliverables": 1})
        self.assertGreater(result["high"], result["low"])
        self.assertGreater(result["expectedViews"], 0)

    def test_more_scope_costs_more(self):
        base = estimate({"followers": 100_000, "engagementRate": 5, "deliverables": 1})
        expanded = estimate({"followers": 100_000, "engagementRate": 5, "deliverables": 3, "usageRights": "perpetual", "exclusivity": "ninety"})
        self.assertGreater(expanded["midpoint"], base["midpoint"])


if __name__ == "__main__":
    unittest.main()
