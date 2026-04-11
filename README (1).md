# Medical Report Translator

Explains medical reports in plain English.

## Setup & Deploy (5 minutes)

### Step 1 — Upload to GitHub
1. Go to github.com and click "New repository"
2. Name it "medical-translator"  
3. Click "Create repository"
4. Upload all these files by dragging them into the GitHub page

### Step 2 — Deploy to Vercel
1. Go to vercel.com and click "Add New Project"
2. Click "Import" next to your medical-translator repository
3. Before clicking Deploy, click "Environment Variables"
4. Add one variable:
   - Name:  ANTHROPIC_API_KEY
   - Value: (paste your Anthropic API key here)
5. Click "Deploy"

That's it! Vercel gives you a live URL like:
https://medical-translator-abc123.vercel.app

### How it works
- Your browser talks to /api/explain (a Vercel function)
- The Vercel function talks to Anthropic using your API key (stored safely on the server)
- Results come back to your browser
- Your API key is never exposed to users
