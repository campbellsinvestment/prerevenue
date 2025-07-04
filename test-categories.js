// Simple test to verify the new category-based scoring system
const testData = {
  title: "AI-Powered SaaS Tool",
  description: "An AI-powered productivity tool that helps developers write better code using machine learning algorithms. Built with React and Node.js, serving 1000+ developers.",
  user_base: 1500,
  traffic: 10000,
  monthly_cost: 200,
  categories: ["AI", "SaaS", "React", "Node.js"]
};

console.log("Testing new category-based evaluation system...");
console.log("Test data:", testData);

fetch('http://localhost:3000/api/successscore', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(testData)
})
.then(res => res.json())
.then(result => {
  console.log("\n=== EVALUATION RESULTS ===");
  console.log("Success Score:", result.successScore);
  console.log("Estimated Valuation:", result.estimatedValuation);
  console.log("Valuation Range:", result.valuationRange);
  
  console.log("\n=== CATEGORY ANALYSIS ===");
  console.log("Categories tested:", testData.categories);
  console.log("Expected high multiplier for AI (1.6x) and SaaS (1.5x)");
  console.log("This should result in higher valuation than basic categories");
})
.catch(err => console.error('Test failed:', err));
