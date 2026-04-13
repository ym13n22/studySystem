// Test script for progress update logic

// Mock learning plan - actual Chinese data from database
const mockPlan = [
  { step: 1, title: '基本数学概念', description: '了解基本的数学概念，如数字、运算符号、数量关系等' },
  { step: 2, title: '四则运算', description: '学习和练习基本的四则运算：加、减、乘、除' },
  { step: 3, title: '分数和小数', description: '了解分数和小数的概念，学习如何进行基本的分数和小数运算' },
  { step: 4, title: '几何基础', description: '学习基本的几何概念，如点、线、面、角等' },
  { step: 5, title: '基本代数', description: '学习基本的代数概念，如变量、常数、代数式等' },
  { step: 6, title: '图形和坐标', description: '学习如何画图和使用坐标系，了解图形与方程的关系' },
  { step: 7, title: '三角函数', description: '学习三角函数的概念，如正弦、余弦、正切等' },
  { step: 8, title: '微积分基础', description: '学习微积分的基本概念，如导数、积分等' },
  { step: 9, title: '数学模型', description: '学习如何建立和应用数学模型解决实际问题' },
  { step: 10, title: '综合应用', description: '练习综合应用数学知识解决复杂问题，培养数学思维和问题解决能力' }
];

const currentPlan = {
  completed_steps: 6,
  total_steps: 10
};

// Mock AI summary - Chinese suggestions mentioning Step 1 (which is completed)
const mockSummary = `
Strengths:
- 对基本数学概念理解良好
- 四则运算掌握扎实

Weaknesses:
- 分数和小数运算较弱
- 几何基础需要加强

Suggestions:
- 基于你在基本数学概念方面的弱点，重点关注 Step 1: 基本数学概念 来提升理解
- 学习 Step 4: 几何基础 来加强几何知识
`;

console.log('Testing progress update logic...\n');
console.log('Current completed steps:', currentPlan.completed_steps, '/', currentPlan.total_steps);
console.log('Plan structure:', JSON.stringify(mockPlan, null, 2));
console.log('\nAI Summary:', mockSummary);

// Parse summary
const weaknessMatch = mockSummary.match(/Weaknesses:(.*?)(?=\n\nSuggestions:|$)/s);
const strengthMatch = mockSummary.match(/Strengths:(.*?)(?=\n\nWeaknesses:|$)/s);
const suggestionsMatch = mockSummary.match(/Suggestions:(.*?)$/s);

console.log('\n--- Parsing Results ---');
console.log('Weakness match:', weaknessMatch ? 'Found' : 'Not found');
console.log('Strength match:', strengthMatch ? 'Found' : 'Not found');
console.log('Suggestions match:', suggestionsMatch ? 'Found' : 'Not found');

// Match weaknesses to learning plan steps
const weaknessesToDowngrade = [];
const strengthsToUpgrade = [];

if (weaknessMatch) {
  const weaknessText = weaknessMatch[1];
  console.log('\n--- Weakness Text ---');
  console.log(weaknessText);
  
  mockPlan.forEach((step, index) => {
    const weaknessLower = weaknessText.toLowerCase();
    
    // Check if step number is mentioned (e.g., "step 1", "Step 1")
    const stepNumberMatch = weaknessLower.includes(`step ${step.step}`) || weaknessLower.includes(`Step ${step.step}`);
    
    // Check if step title words are mentioned
    const stepWords = step.title.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const titleMatch = stepWords.some(word => weaknessLower.includes(word));
    
    // Check if step description words are mentioned
    const descWords = step.description.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const descMatch = descWords.some(word => weaknessLower.includes(word));
    
    const hasMatch = stepNumberMatch || titleMatch || descMatch;
    
    if (hasMatch && index < currentPlan.completed_steps) {
      weaknessesToDowngrade.push(index);
      console.log(`✓ Weakness matched step ${index}: ${step.title} (number: ${stepNumberMatch}, title: ${titleMatch}, desc: ${descMatch})`);
    } else {
      console.log(`✗ Step ${index}: ${step.title} (number: ${stepNumberMatch}, title: ${titleMatch}, desc: ${descMatch}, hasMatch: ${hasMatch}, index < completed: ${index < currentPlan.completed_steps})`);
    }
  });
}

if (strengthMatch) {
  const strengthText = strengthMatch[1];
  console.log('\n--- Strength Text ---');
  console.log(strengthText);
  
  mockPlan.forEach((step, index) => {
    const strengthLower = strengthText.toLowerCase();
    
    // Check if step number is mentioned (e.g., "step 1", "Step 1")
    const stepNumberMatch = strengthLower.includes(`step ${step.step}`) || strengthLower.includes(`Step ${step.step}`);
    
    // Check if step title words are mentioned
    const stepWords = step.title.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const titleMatch = stepWords.some(word => strengthLower.includes(word));
    
    // Check if step description words are mentioned
    const descWords = step.description.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const descMatch = descWords.some(word => strengthLower.includes(word));
    
    const hasMatch = stepNumberMatch || titleMatch || descMatch;
    
    if (hasMatch && index >= currentPlan.completed_steps) {
      strengthsToUpgrade.push(index);
      console.log(`✓ Strength matched step ${index}: ${step.title} (number: ${stepNumberMatch}, title: ${titleMatch}, desc: ${descMatch})`);
    } else {
      console.log(`✗ Step ${index}: ${step.title} (number: ${stepNumberMatch}, title: ${titleMatch}, desc: ${descMatch}, hasMatch: ${hasMatch}, index >= completed: ${index >= currentPlan.completed_steps})`);
    }
  });
}

// Also check suggestions section for step references to downgrade
if (suggestionsMatch) {
  const suggestionsText = suggestionsMatch[1];
  console.log('\n--- Suggestions Text ---');
  console.log(suggestionsText);
  
  mockPlan.forEach((step, index) => {
    const suggestionsLower = suggestionsText.toLowerCase();
    
    // Only check if step number is mentioned in suggestions (exact format "Step X:")
    const stepNumberMatch = suggestionsLower.includes(`step ${step.step}:`) || suggestionsLower.includes(`step ${step.step} `);
    
    if (stepNumberMatch && index < currentPlan.completed_steps) {
      if (!weaknessesToDowngrade.includes(index)) {
        weaknessesToDowngrade.push(index);
        console.log(`✓ Suggestion matched step ${index} for downgrade: ${step.title} (number: ${stepNumberMatch})`);
      }
    } else {
      console.log(`✗ Step ${index}: ${step.title} (number: ${stepNumberMatch}, index < completed: ${index < currentPlan.completed_steps})`);
    }
  });
}

console.log('\n--- Final Results ---');
console.log('Weaknesses to downgrade:', weaknessesToDowngrade);
console.log('Strengths to upgrade:', strengthsToUpgrade);

// Calculate progress update
if (weaknessesToDowngrade.length > 0) {
  const minDowngradeIndex = Math.min(...weaknessesToDowngrade);
  const newCompletedSteps = Math.max(0, minDowngradeIndex);
  const newProgressPercentage = Math.round((newCompletedSteps / currentPlan.total_steps) * 100);
  
  console.log('\n✓ Would downgrade progress from', currentPlan.completed_steps, 'to', newCompletedSteps);
  console.log('New progress percentage:', newProgressPercentage + '%');
} else if (strengthsToUpgrade.length > 0) {
  const maxUpgradeIndex = Math.max(...strengthsToUpgrade);
  const newCompletedSteps = Math.min(currentPlan.total_steps, maxUpgradeIndex + 1);
  const newProgressPercentage = Math.round((newCompletedSteps / currentPlan.total_steps) * 100);
  
  console.log('\n✓ Would upgrade progress from', currentPlan.completed_steps, 'to', newCompletedSteps);
  console.log('New progress percentage:', newProgressPercentage + '%');
} else {
  console.log('\n✗ No step matches found, would not update progress');
}

require('dotenv').config();
const supabase = require('./config/supabase');

async function testProgressUpdateWithDatabase() {
  console.log('Testing progress update with database connection...\n');
  
  try {
    // Fetch learning plan from database
    console.log('Fetching learning plan from database...');
    const { data: plans, error: fetchError } = await supabase
      .from('learning_plans')
      .select('*')
      .eq('topic', '数学')
      .single();
    
    if (fetchError) {
      console.error('Error fetching learning plan:', fetchError);
      return;
    }
    
    if (!plans) {
      console.log('No learning plan found for topic "数学"');
      return;
    }
    
    const plan = JSON.parse(plans.plan_content);
    const currentPlan = {
      completed_steps: plans.completed_steps,
      total_steps: plans.total_steps
    };
    
    console.log('Current completed steps:', currentPlan.completed_steps, '/', currentPlan.total_steps);
    console.log('Plan structure:', JSON.stringify(plan, null, 2));
    
    // Mock AI summary - Chinese suggestions mentioning Step 1 (which is completed)
    const mockSummary = `
Strengths:
- 对基本数学概念理解良好
- 四则运算掌握扎实

Weaknesses:
- 分数和小数运算较弱
- 几何基础需要加强

Suggestions:
- 基于你在基本数学概念方面的弱点，重点关注 Step 1: 基本数学概念 来提升理解
- 学习 Step 4: 几何基础 来加强几何知识
`;

    console.log('\nAI Summary:', mockSummary);

    // Parse summary
    const weaknessMatch = mockSummary.match(/Weaknesses:(.*?)(?=\n\nSuggestions:|$)/s);
    const strengthMatch = mockSummary.match(/Strengths:(.*?)(?=\n\nWeaknesses:|$)/s);
    const suggestionsMatch = mockSummary.match(/Suggestions:(.*?)$/s);

    console.log('\n--- Parsing Results ---');
    console.log('Weakness match:', weaknessMatch ? 'Found' : 'Not found');
    console.log('Strength match:', strengthMatch ? 'Found' : 'Not found');
    console.log('Suggestions match:', suggestionsMatch ? 'Found' : 'Not found');

    // Match weaknesses to learning plan steps
    const weaknessesToDowngrade = [];
    // Match strengths to learning plan steps
    const strengthsToUpgrade = [];

    if (weaknessMatch) {
      const weaknessText = weaknessMatch[1];
      console.log('\n--- Weakness Text ---');
      console.log(weaknessText);
      
      plan.forEach((step, index) => {
        const weaknessLower = weaknessText.toLowerCase();
        
        // Check if step number is mentioned (e.g., "step 1", "Step 1")
        const stepNumberMatch = weaknessLower.includes(`step ${step.step}`) || weaknessLower.includes(`Step ${step.step}`);
        
        // Check if step title words are mentioned
        const stepWords = step.title.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        const titleMatch = stepWords.some(word => weaknessLower.includes(word));
        
        // Check if step description words are mentioned
        const descWords = step.description.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        const descMatch = descWords.some(word => weaknessLower.includes(word));
        
        const hasMatch = stepNumberMatch || titleMatch || descMatch;
        
        if (hasMatch && index < currentPlan.completed_steps) {
          weaknessesToDowngrade.push(index);
          console.log(`✓ Weakness matched step ${index}: ${step.title} (number: ${stepNumberMatch}, title: ${titleMatch}, desc: ${descMatch})`);
        } else {
          console.log(`✗ Step ${index}: ${step.title} (number: ${stepNumberMatch}, title: ${titleMatch}, desc: ${descMatch}, hasMatch: ${hasMatch}, index < completed: ${index < currentPlan.completed_steps})`);
        }
      });
    }

    if (strengthMatch) {
      const strengthText = strengthMatch[1];
      console.log('\n--- Strength Text ---');
      console.log(strengthText);
      
      plan.forEach((step, index) => {
        const strengthLower = strengthText.toLowerCase();
        
        // Check if step number is mentioned (e.g., "step 1", "Step 1")
        const stepNumberMatch = strengthLower.includes(`step ${step.step}`) || strengthLower.includes(`Step ${step.step}`);
        
        // Check if step title words are mentioned
        const stepWords = step.title.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        const titleMatch = stepWords.some(word => strengthLower.includes(word));
        
        // Check if step description words are mentioned
        const descWords = step.description.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        const descMatch = descWords.some(word => strengthLower.includes(word));
        
        const hasMatch = stepNumberMatch || titleMatch || descMatch;
        
        if (hasMatch && index >= currentPlan.completed_steps) {
          strengthsToUpgrade.push(index);
          console.log(`✓ Strength matched step ${index}: ${step.title} (number: ${stepNumberMatch}, title: ${titleMatch}, desc: ${descMatch})`);
        } else {
          console.log(`✗ Step ${index}: ${step.title} (number: ${stepNumberMatch}, title: ${titleMatch}, desc: ${descMatch}, hasMatch: ${hasMatch}, index >= completed: ${index >= currentPlan.completed_steps})`);
        }
      });
    }

    // Also check suggestions section for step references to downgrade
    if (suggestionsMatch) {
      const suggestionsText = suggestionsMatch[1];
      console.log('\n--- Suggestions Text ---');
      console.log(suggestionsText);
      
      plan.forEach((step, index) => {
        const suggestionsLower = suggestionsText.toLowerCase();
        
        // Only check if step number is mentioned in suggestions (exact format "Step X:")
        const stepNumberMatch = suggestionsLower.includes(`step ${step.step}:`) || suggestionsLower.includes(`step ${step.step} `);
        
        if (stepNumberMatch && index < currentPlan.completed_steps) {
          if (!weaknessesToDowngrade.includes(index)) {
            weaknessesToDowngrade.push(index);
            console.log(`✓ Suggestion matched step ${index} for downgrade: ${step.title} (number: ${stepNumberMatch})`);
          }
        } else {
          console.log(`✗ Step ${index}: ${step.title} (number: ${stepNumberMatch}, index < completed: ${index < currentPlan.completed_steps})`);
        }
      });
    }

    console.log('\n--- Final Results ---');
    console.log('Weaknesses to downgrade:', weaknessesToDowngrade);
    console.log('Strengths to upgrade:', strengthsToUpgrade);

    // Calculate and apply progress update
    if (weaknessesToDowngrade.length > 0) {
      const minDowngradeIndex = Math.min(...weaknessesToDowngrade);
      const newCompletedSteps = Math.max(0, minDowngradeIndex);
      const newProgressPercentage = Math.round((newCompletedSteps / currentPlan.total_steps) * 100);
      
      console.log('\n✓ Downgrading progress from', currentPlan.completed_steps, 'to', newCompletedSteps);
      console.log('New progress percentage:', newProgressPercentage + '%');
      
      // Update database
      console.log('\nUpdating database...');
      const { error: updateError } = await supabase
        .from('learning_plans')
        .update({
          completed_steps: newCompletedSteps,
          progress_percentage: newProgressPercentage,
          updated_at: new Date().toISOString()
        })
        .eq('id', plans.id);
      
      if (updateError) {
        console.error('Error updating database:', updateError);
        return;
      }
      
      console.log('✓ Successfully updated database');
      
      // Verify update
      console.log('\nVerifying update...');
      const { data: updatedPlan, error: verifyError } = await supabase
        .from('learning_plans')
        .select('*')
        .eq('id', plans.id)
        .single();
      
      if (verifyError) {
        console.error('Error verifying update:', verifyError);
        return;
      }
      
      console.log('Verified completed steps:', updatedPlan.completed_steps, '/', updatedPlan.total_steps);
      console.log('Verified progress percentage:', updatedPlan.progress_percentage + '%');
      console.log('\n✓ Database update complete - keeping at 0');
      
    } else if (strengthsToUpgrade.length > 0) {
      const maxUpgradeIndex = Math.max(...strengthsToUpgrade);
      const newCompletedSteps = Math.min(currentPlan.total_steps, maxUpgradeIndex + 1);
      const newProgressPercentage = Math.round((newCompletedSteps / currentPlan.total_steps) * 100);
      
      console.log('\n✓ Would upgrade progress from', currentPlan.completed_steps, 'to', newCompletedSteps);
      console.log('New progress percentage:', newProgressPercentage + '%');
    } else {
      console.log('\n✗ No step matches found, would not update progress');
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testProgressUpdateWithDatabase();
