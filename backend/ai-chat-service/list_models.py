#!/usr/bin/env python3
"""
List Available Google AI Models

This script queries the Google AI API to list all available models
and their supported methods (like generateContent, etc.)
"""
import os
import sys
from pathlib import Path

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent / "src"))

try:
    import google.generativeai as genai
    from google.generativeai import types
except ImportError:
    print("❌ Error: google-generativeai package not installed")
    print("Install it with: pip install google-generativeai")
    sys.exit(1)

# Load API key from .env file
from dotenv import load_dotenv
load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    print("❌ Error: GEMINI_API_KEY not found in .env file")
    print("Please set GEMINI_API_KEY in backend/ai-chat-service/.env")
    sys.exit(1)

# Configure the API
genai.configure(api_key=api_key)

print("🔍 Fetching available models from Google AI API...")
print("=" * 80)

try:
    # List all models - convert to list immediately to avoid generator exhaustion
    models_list = list(genai.list_models())
    
    print(f"\n✅ Found {len(models_list)} models:\n")
    
    # Group models by type
    model_groups = {
        "Gemini Models": [],
        "Gemma Models": [],
        "Embedding Models": [],
        "Other Models": []
    }
    
    for model in models_list:
        model_name = model.name.replace("models/", "")
        
        # Get supported methods - it's a list attribute
        supported_methods = []
        if hasattr(model, 'supported_generation_methods'):
            methods = model.supported_generation_methods
            if methods:
                supported_methods = list(methods) if not isinstance(methods, list) else methods
        
        model_info = {
            "name": model_name,
            "display_name": getattr(model, 'display_name', 'N/A'),
            "description": getattr(model, 'description', 'N/A'),
            "methods": supported_methods,
            "input_token_limit": getattr(model, 'input_token_limit', 'N/A'),
            "output_token_limit": getattr(model, 'output_token_limit', 'N/A'),
        }
        
        # Categorize models
        if "gemini" in model_name.lower():
            model_groups["Gemini Models"].append(model_info)
        elif "gemma" in model_name.lower():
            model_groups["Gemma Models"].append(model_info)
        elif "embedding" in model_name.lower():
            model_groups["Embedding Models"].append(model_info)
        else:
            model_groups["Other Models"].append(model_info)
    
    # Print grouped models
    for group_name, models_list in model_groups.items():
        if models_list:
            print(f"\n📦 {group_name}")
            print("-" * 80)
            
            for model in models_list:
                print(f"\n  Model: {model['name']}")
                if model['display_name'] != 'N/A':
                    print(f"  Display Name: {model['display_name']}")
                if model['description'] != 'N/A':
                    print(f"  Description: {model['description']}")
                
                if model['input_token_limit'] != 'N/A':
                    print(f"  Input Token Limit: {model['input_token_limit']:,}")
                if model['output_token_limit'] != 'N/A':
                    print(f"  Output Token Limit: {model['output_token_limit']:,}")
                
                if model['methods']:
                    print(f"  Supported Methods: {', '.join(model['methods'])}")
                    if 'generateContent' in model['methods']:
                        print(f"    ✅ Can be used for chat/completion")
                    if 'embedContent' in model['methods']:
                        print(f"    ✅ Can be used for embeddings")
                else:
                    print(f"  Supported Methods: (not specified or empty)")
                print()
    
    # Print summary of models that support generateContent (for chat)
    print("\n" + "=" * 80)
    print("📊 SUMMARY: Models that support generateContent (for chat):")
    print("=" * 80)
    
    chat_models = []
    for group_name, models_list in model_groups.items():
        for model in models_list:
            if model['methods'] and 'generateContent' in model['methods']:
                chat_models.append(model['name'])
    
    if chat_models:
        for i, model_name in enumerate(sorted(chat_models), 1):
            print(f"  {i}. {model_name}")
    else:
        print("  (No models found with generateContent support)")
    
    print("\n" + "=" * 80)
    print("💡 RECOMMENDATIONS:")
    print("=" * 80)
    print("For LangChain ChatGoogleGenerativeAI, use models that support 'generateContent'")
    print("Common working models:")
    print("  - gemini-1.5-flash (stable, widely available)")
    print("  - gemini-1.5-pro (more capable)")
    print("  - gemini-2.0-flash-exp (experimental)")
    print("  - gemini-2.5-flash (if available)")
    print("\n⚠️  Note: Model availability may vary by region and API tier")
    
except Exception as e:
    print(f"\n❌ Error fetching models: {e}")
    print(f"Error type: {type(e).__name__}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
