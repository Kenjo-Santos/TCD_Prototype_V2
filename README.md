# The Clean Divorce — FAQ Assistant Prototype V2

## Project files

- `index.html` — chatbot page structure.
- `css/styles.css` — layout, colors, responsive design, and chat styling.
- `js/app.js` — local commands, safety keyword check, FAQ loading, embedding matching, Cross-Encoder reranking, response selection, and debug information.
- `data/faqs.json` — the eight FAQ entries and their approval status.

## Run in Visual Studio Code

1. Extract the project ZIP.
2. In VS Code, select **File → Open Folder** and open the `tcd_prototype_v2` folder.
3. Open **Terminal → New Terminal**.
4. Run this command from the `tcd_prototype_v2` folder:

   ```powershell
   py -m http.server 8000
   ```

   If `py` is not recognized, try `python -m http.server 8000`.

5. Open `http://localhost:8000/` in your browser.

Do not open `index.html` directly with `file://`. The page loads `data/faqs.json` with `fetch()` and loads the AI library as a JavaScript module.

## Response order

1. **Safety concern:** a limited keyword-based check runs first and shows the safety message when a matching pattern is detected.
2. **Help request:** `help`, `please help`, `what can I ask?`, and related standalone help commands show the help message. This does not require an AI model download.
3. **Greeting:** a short greeting receives a local greeting response without loading AI models.
4. **Out-of-scope question:** the embedding model compares the question with the saved FAQ questions. Clear unrelated questions are stopped before the Cross-Encoder is loaded.
5. **FAQ matching:** in-scope questions are reranked by the Cross-Encoder. A saved answer is returned only when the configured similarity checks pass.
6. **Related but unanswered question:** the chatbot shows the FAQ-not-found response.
7. **Technical error:** the chatbot displays an assistant-unavailable message. The help and safety commands remain available because Transformers.js is loaded only when FAQ matching is needed.

## Models

- Embedding model: `onnx-community/all-MiniLM-L6-v2-ONNX`
- Cross-Encoder: `Xenova/ms-marco-MiniLM-L-6-v2`
- Transformers.js: `4.2.0` from jsDelivr, loaded dynamically only when FAQ matching is needed.

The embedding model's model card documents the Transformers.js feature-extraction pipeline with mean pooling and normalized embeddings: https://huggingface.co/onnx-community/all-MiniLM-L6-v2-ONNX

The Cross-Encoder model card documents its use with the Transformers.js text-classification task: https://huggingface.co/Xenova/ms-marco-MiniLM-L-6-v2

The models are downloaded the first time a matching question needs them. An internet connection is required for the CDN and model downloads. A model or network error does not disable the local help and greeting commands.

## Thresholds — must be tested

In `js/app.js`, the starting values are:

```javascript
const MIN_SCOPE_SIMILARITY = 0.30;
const MIN_FAQ_COSINE_SCORE = 0.35;
const CROSS_ENCODER_SCORE_THRESHOLD = 1.0;
```

These values are prototype starting points, not validated or production-ready thresholds. Record the scores for exact questions, paraphrases, short questions, similar-but-different questions, and unrelated questions. Tune the values based on correct and incorrect results. Cross-Encoder scores are raw model scores, not probabilities.

## Important limitations

- The safety check is keyword-based. It can miss wording it does not recognize and can flag some harmless questions. It is not a complete safety assessment and must be reviewed before public use.
- The scope check uses domain keywords and embedding similarity. It is a lightweight prototype gate, not a full intent classifier.
- The FAQ answers are returned from `data/faqs.json`. The chatbot does not generate or personalize legal advice.
- The FAQ text is preserved from the supplied prototype dataset. The Clean Divorce should confirm its accuracy and approval before public use.
- The code and JSON structure can be checked locally, but model downloads and browser inference still need to be tested on the computer that will run the prototype.
