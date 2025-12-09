import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function translateBatch(sentences) {
  const prompt = `You are a professional English-to-Hebrew translator. Translate the following English sentences to natural, conversational Hebrew. Pay attention to verb tenses and context.

For sentences with blanks like "_____ (verb)", translate the complete sentence as if the blank is filled with the correct verb form.

Important: Return ONLY a valid JSON array of translations in the exact same order as the input sentences, with no additional text, explanation, or markdown formatting.

Sentences to translate:
${sentences.map((s, i) => `${i + 1}. ${s}`).join('\n')}

Return format: ["תרגום 1", "תרגום 2", ...]`;

  try {
    // Use direct API call with proper model name
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=AIzaSyCTSW4P6yGE60TElK0L-_fRxxjR-SzEFCk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 8000
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    const text = data.candidates[0].content.parts[0].text;
    
    // Extract JSON array from response (handle markdown code blocks)
    let jsonText = text.trim();
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```json?\n?/g, '').replace(/```\n?$/g, '').trim();
    }
    
    const jsonMatch = jsonText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('Raw response:', text);
      throw new Error('Could not parse JSON from response');
    }
    
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Translation error:', error.message);
    throw error;
  }
}

async function processPastSimpleProgressive() {
  const filePath = path.join(__dirname, '../public/bands/past_simple_progressive.json');
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  console.log(`Processing past_simple_progressive.json - ${data.length} exercises`);
  
  // Extract all English sentences
  const sentences = data.map(item => item.english);
  
  // Translate in batches of 15 to avoid token limits
  const batchSize = 15;
  const allTranslations = [];
  
  for (let i = 0; i < sentences.length; i += batchSize) {
    const batch = sentences.slice(i, i + batchSize);
    console.log(`  Translating batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(sentences.length / batchSize)}...`);
    const translations = await translateBatch(batch);
    allTranslations.push(...translations);
    
    // Small delay to avoid rate limits
    if (i + batchSize < sentences.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // Add translations to data
  data.forEach((item, index) => {
    item.hint = allTranslations[index];
    item.translation = allTranslations[index];
  });
  
  // Save updated file
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`✓ Updated past_simple_progressive.json with ${allTranslations.length} translations`);
  
  return { file: 'past_simple_progressive.json', count: allTranslations.length };
}

async function processSentencesPractice() {
  const filePath = path.join(__dirname, '../public/bands/sentences_practice.json');
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  console.log(`Processing sentences_practice.json - ${data.length} exercises`);
  
  // Extract all English sentences
  const sentences = data.map(item => item.english);
  
  // Translate in batches of 20
  const batchSize = 20;
  const allTranslations = [];
  
  for (let i = 0; i < sentences.length; i += batchSize) {
    const batch = sentences.slice(i, i + batchSize);
    console.log(`  Translating batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(sentences.length / batchSize)}...`);
    const translations = await translateBatch(batch);
    allTranslations.push(...translations);
    
    // Small delay to avoid rate limits
    if (i + batchSize < sentences.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // Add translations to data
  data.forEach((item, index) => {
    item.hint = allTranslations[index];
    item.translation = allTranslations[index];
  });
  
  // Save updated file
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`✓ Updated sentences_practice.json with ${allTranslations.length} translations`);
  
  return { file: 'sentences_practice.json', count: allTranslations.length };
}

async function main() {
  console.log('Starting translation process...\n');
  
  try {
    const results = [];
    
    // Process each file
    results.push(await processPastSimpleProgressive());
    results.push(await processSentencesPractice());
    
    // Summary
    console.log('\n=== SUMMARY ===');
    results.forEach(r => {
      console.log(`${r.file}: ${r.count} translations added`);
    });
    console.log(`\nTotal: ${results.reduce((sum, r) => sum + r.count, 0)} translations added`);
    console.log('Files updated: ' + results.length);
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
