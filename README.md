# The Clean Divorce — FAQ Assistant Prototype V2

## Project files

- `index.html` — chatbot page structure and interface elements.
- `css/styles.css` — layout, colors, responsive design, and chat styling.
- `js/app.js` — application logic, local commands, safety keyword check, spelling correction, FAQ loading, embedding matching, Cross-Encoder reranking, response selection, FAQ hover definitions, and debug information.
- `data/faqs.json` — the eight original FAQ entries, including their questions, approved answers, and approval statuses.

**Important:** The FAQ glossary and code comments are contained in `app.js`. No additional project files are required. The original FAQ JSON file remains unchanged.

## Run in Visual Studio Code

1. Extract the project ZIP.
2. In VS Code, select **File → Open Folder** and open the `tcd_prototype_v2` folder.
3. Open **Terminal → New Terminal**.
4. Run this command from the `tcd_prototype_v2` folder:

   ```powershell
   py -m http.server 8000
   ```

   If `py` is not recognized, try:

   ```powershell
   python -m http.server 8000
   ```

5. Open `http://localhost:8000/` in your browser.

Do not open `index.html` directly with `file://`. The page loads `data/faqs.json` using `fetch()` and loads the AI library as a JavaScript module.

## Response order

The chatbot follows this general order when processing a user's question:

1. **Safety concern:** A limited keyword-based check runs first. If a matching safety pattern is detected, the chatbot displays its safety message and skips normal FAQ matching.

2. **Help request:** Commands such as `help`, `please help`, and `what can I ask?` display the help message. This works without downloading the AI models.

3. **Greeting:** Simple greetings receive a predefined greeting response without loading the AI models.

4. **FAQ data check:** The chatbot checks whether the original FAQ JSON file was loaded successfully and contains approved FAQ entries.

5. **Spelling correction:** Typo.js attempts to correct spelling mistakes. If the spelling dictionary cannot load, the chatbot continues using the original wording.

6. **Safety and local command recheck:** The chatbot checks the corrected question for safety patterns and recognizes help or greeting commands again.

7. **Question matching:** The embedding model compares the user's question with the eight saved, approved FAQ questions and identifies the closest candidates.

8. **Out-of-scope check:** If the question has no recognized domain keyword and its best similarity score is below the configured scope threshold, the chatbot displays the out-of-scope response.

9. **Cross-Encoder reranking:** The Cross-Encoder evaluates the closest FAQ candidates and ranks them according to their relevance to the user's question.

10. **Answer selection:** The chatbot accepts the best candidate only when both its FAQ cosine similarity and Cross-Encoder score meet their configured minimum thresholds.

11. **FAQ not found:** If the selected candidate does not pass the matching thresholds, the chatbot displays the FAQ-not-found response instead of guessing an answer.

12. **Technical error:** If a model or another required component fails, the chatbot displays an assistant-unavailable message. Local help, greeting, and safety responses remain available.

## FAQ hover definitions

The chatbot includes a small glossary feature inside the displayed FAQ answers.

- Technical terms that have definitions are underlined.
- Moving the mouse over an underlined term displays a small explanation.
- Keyboard users can focus on the underlined term to view the same explanation.
- Definitions are written in simple language to make unfamiliar terminology easier to understand.
- The glossary definitions are stored directly in `js/app.js`.

Examples of terms that can have definitions include:

- Mediation
- Neutral third party
- Mediator
- Negotiate
- Property division
- Child custody
- Independent legal advice
- Domestic violence
- Traditional litigation
- Settlement agreement
- Memorandum of understanding
- Legally binding
- Enforceable

**Important:** The glossary does not replace or rewrite the original FAQ answers. It adds explanations alongside the existing answer text. The approved answers remain stored in `data/faqs.json`.

## Code comments and architecture

The `js/app.js` file contains section headings and comments to explain the purpose of the major parts of the application.

The main sections include:

1. External libraries, AI models, and matching configuration.
2. User-facing responses and FAQ glossary.
3. Page elements and application state.
4. Chat display, glossary tooltips, and debug information.
5. Question normalization and spelling support.
6. Local commands, safety override, and topic checking.
7. Approved FAQ data and AI model loading.
8. Main question-processing pipeline.
9. User interaction and application startup.

These comments are intended to help developers understand how the application is organized, how its components interact, and where specific functionality is handled.

## Models and libraries

**Embedding model:**
`onnx-community/all-MiniLM-L6-v2-ONNX`

The embedding model converts questions into numerical representations so the chatbot can compare the meaning of the user's question with the saved FAQ questions.

The implementation uses mean pooling and normalized embeddings.

**Cross-Encoder:**
`Xenova/ms-marco-MiniLM-L-6-v2`

The Cross-Encoder evaluates the relationship between the user's question and the shortlisted FAQ questions. It provides scores used to rank the candidates.

**Transformers.js:**
Version `4.2.0`, loaded from jsDelivr.

Transformers.js is dynamically imported when FAQ matching is required.

**Typo.js:**

Used for English spelling correction. The application loads the English spelling dictionary when spelling correction is needed.

The models and libraries require an internet connection when they have not already been downloaded or cached. A network or model-loading error does not disable the local help and greeting commands.

Model references:

- Embedding model: https://huggingface.co/onnx-community/all-MiniLM-L6-v2-ONNX
- Cross-Encoder: https://huggingface.co/Xenova/ms-marco-MiniLM-L-6-v2

## Matching thresholds — must be tested

In `js/app.js`, the current starting values are:

```javascript
const MIN_SCOPE_SIMILARITY = 0.30;
const MIN_FAQ_COSINE_SCORE = 0.35;
const CROSS_ENCODER_SCORE_THRESHOLD = 1.0;
```

These values are prototype starting points. They have not been validated for production use.

The chatbot uses two matching stages:

**Stage 1 — Embedding similarity**

The chatbot compares the user's question with the saved FAQ questions using cosine similarity. It uses this comparison to retrieve the closest candidates.

**Stage 2 — Cross-Encoder reranking**

The Cross-Encoder evaluates the shortlisted candidates and assigns relevance scores. The chatbot uses these scores to help select the best FAQ.

The chatbot accepts the best candidate only when both matching thresholds are satisfied.

Test the chatbot with exact questions, paraphrases, short casual questions, similar-but-different questions, and unrelated questions. Record correct and incorrect matches and adjust the thresholds based on the results.

**Important:** Cosine similarity and Cross-Encoder scores are different measurements. Cross-Encoder scores are raw model scores, not percentages or probabilities.

An exact wording match can produce a cosine similarity of `1.0000`. This does not mean every new paraphrase will receive the same score.

## Debug information

The chatbot has a debug mode that displays information about its matching process.

Depending on the decision, the debug panel can show:

- Whether the question is considered in scope.
- Whether a domain keyword was detected.
- The best cosine similarity score.
- The minimum similarity threshold.
- The selected FAQ ID.
- The Cross-Encoder score.
- The Cross-Encoder acceptance threshold.
- Whether the question was accepted or rejected.
- Any spelling corrections that were applied.
- The shortlisted FAQ candidates and their scores.

Debug information is intended for testing and development. Normal users do not need to see the internal matching details.

## Important limitations

- **Safety check:** The safety check is keyword-based. It can miss wording it does not recognize and can flag some harmless questions. It is not a complete safety assessment and needs further review before public use.

- **Scope detection:** The scope check uses domain keywords and embedding similarity. It is a lightweight prototype check, not a complete intent classifier.

- **FAQ matching:** The current implementation compares questions against the original approved FAQ questions. It does not include a separate list of alternative question phrasings.

- **Legal information:** The chatbot retrieves approved answers from `data/faqs.json`. It does not generate or personalize legal advice.

- **FAQ approval:** The original FAQ text is preserved from the supplied prototype dataset. The Clean Divorce should confirm its accuracy and approval before public use.

- **Glossary:** Definitions are provided for selected terms only. Not every technical or legal term in the FAQ answers necessarily has a hover definition.

- **Thresholds:** The current matching thresholds are initial testing values and should not be treated as validated settings.

- **Testing:** The project structure and JavaScript syntax can be checked locally, but model downloads, browser inference, spelling correction, matching accuracy, and hover definitions still need to be tested on the computer that will run the prototype.

## Overall architecture

The chatbot follows this general process:

**User question → Safety check → Local commands → Spelling correction → Embedding model → FAQ candidate retrieval → Cross-Encoder reranking → Threshold checks → Approved FAQ answer or fallback response**

When an approved FAQ answer is displayed, the glossary feature provides additional explanations for selected terms without changing the original approved answer.

The main purpose of the prototype is to provide relevant answers from an approved FAQ database while avoiding automatically generated legal responses.