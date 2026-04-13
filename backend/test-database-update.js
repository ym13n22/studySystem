require('dotenv').config();
const supabase = require('./config/supabase');

async function testDatabaseUpdate() {
  console.log('Testing database update...\n');
  
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
    console.log('Found learning plan:', plan.id, plan.topic);
    console.log('Current completed steps:', plan.completed_steps, '/', plan.total_steps);
    
    // Test updating the progress
    console.log('\nTesting progress update...');
    const newCompletedSteps = plan.completed_steps > 0 ? plan.completed_steps - 1 : 0;
    const newProgressPercentage = Math.round((newCompletedSteps / plan.total_steps) * 100);
    
    console.log('New completed steps:', newCompletedSteps);
    console.log('New progress percentage:', newProgressPercentage + '%');
    
    const { error: updateError } = await supabase
      .from('learning_plans')
      .update({
        completed_steps: newCompletedSteps,
        progress_percentage: newProgressPercentage,
        updated_at: new Date().toISOString()
      })
      .eq('id', plan.id);
    
    if (updateError) {
      console.error('Error updating learning plan:', updateError);
      return;
    }
    
    console.log('✓ Successfully updated learning plan');
    
    // Verify the update
    console.log('\nVerifying update...');
    const { data: updatedPlan, error: verifyError } = await supabase
      .from('learning_plans')
      .select('*')
      .eq('id', plan.id)
      .single();
    
    if (verifyError) {
      console.error('Error verifying update:', verifyError);
      return;
    }
    
    console.log('Verified completed steps:', updatedPlan.completed_steps, '/', updatedPlan.total_steps);
    console.log('Verified progress percentage:', updatedPlan.progress_percentage + '%');
    
    // Restore original value
    console.log('\nRestoring original value...');
    const { error: restoreError } = await supabase
      .from('learning_plans')
      .update({
        completed_steps: plan.completed_steps,
        progress_percentage: plan.progress_percentage,
        updated_at: plan.updated_at
      })
      .eq('id', plan.id);
    
    if (restoreError) {
      console.error('Error restoring original value:', restoreError);
    } else {
      console.log('✓ Successfully restored original value');
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testDatabaseUpdate();
