require('dotenv').config();

const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;
const HUGGINGFACE_MODEL = process.env.HUGGINGFACE_MODEL || 'mistralai/Mistral-7B-Instruct-v0.3';

async function testHuggingFace() {
  console.log('Testing Hugging Face API...');
  console.log('Model:', HUGGINGFACE_MODEL);
  
  try {
    const response = await fetch(`https://router.huggingface.co/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: HUGGINGFACE_MODEL,
        messages: [{ role: 'user', content: 'Hello, can you respond with "Test successful"?' }],
        max_tokens: 100,
        temperature: 0.7,
      }),
    });

    console.log('Status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      throw new Error(`Hugging Face API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (data.choices && data.choices.length > 0) {
      console.log('Generated text:', data.choices[0].message.content);
      console.log('\n✓ Test successful!');
    } else {
      console.error('Unexpected response format');
    }
  } catch (error) {
    console.error('Test failed:', error.message);
    process.exit(1);
  }
}

testHuggingFace();
