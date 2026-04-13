require('dotenv').config();
const supabase = require('./config/supabase');

async function testFetchPlan() {
  console.log('Testing fetch learning plan...\n');
  
  try {
    // Fetch a learning plan
    console.log('Fetching learning plan...');
    const { data: plans, error: fetchError } = await supabase
      .from('learning_plans')
      .select('*')
      .limit(1);
    
    if (fetchError) {
      console.error('Error fetching learning plan:', fetchError);
      return;
    }
    
    if (!plans || plans.length === 0) {
      console.log('No learning plans found in database');
      return;
    }
    
    const plan = plans[0];
    console.log('Found learning plan:');
    console.log('ID:', plan.id);
    console.log('User ID:', plan.user_id);
    console.log('Topic:', plan.topic);
    console.log('Completed steps:', plan.completed_steps);
    console.log('Total steps:', plan.total_steps);
    console.log('Progress percentage:', plan.progress_percentage + '%');
    console.log('\nPlan content structure:');
    console.log(JSON.stringify(JSON.parse(plan.plan_content), null, 2));
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testFetchPlan();
