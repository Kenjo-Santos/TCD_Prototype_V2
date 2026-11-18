
// ============================================================
// THE CLEAN DIVORCE — FAQ ASSISTANT PROTOTYPE V2
// ============================================================

// MODELS AND LIBRARIES

const TRANSFORMERS_MODULE_URL =
	"https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.2.0";

const TYPO_DICTIONARY_PATH =
	"https://cdn.jsdelivr.net/gh/cfinke/Typo.js@master/typo/dictionaries";

const EMBEDDING_MODEL = "onnx-community/all-MiniLM-L6-v2-ONNX";
const CROSS_ENCODER_MODEL = "Xenova/ms-marco-MiniLM-L-6-v2";

const CANDIDATE_COUNT = 5;

// Initial prototype thresholds. Validate these using recorded test results.
const MIN_SCOPE_SIMILARITY = 0.30;
const MIN_FAQ_COSINE_SCORE = 0.35;
const CROSS_ENCODER_SCORE_THRESHOLD = 1.0;


// ============================================================
// ALTERNATIVE FAQ QUESTIONS
// Search phrases only. Original approved answers remain in faqs.json.
// ============================================================

const FAQ_ALTERNATIVES = {
	FAQ001: [
		"How does divorce mediation work?",
		"Can you explain mediation in simple terms?",
		"What's mediation?",
		"What is mediation?",
		"What does a mediator do?",
		"What happens during divorce mediation?",
		"Can you explain the mediation process?",
		"How does mediation work?"
	],

	FAQ002: [
		"How long does mediation usually take?",
		"How many meetings will I need?",
		"How many mediation sessions will I need?",
		"How many sessions does mediation take?",
		"How long does it take?",
		"What's the usual mediation timeline?",
		"When will mediation be finished?",
		"How many appointments are required?"
	],

	FAQ003: [
		"Do I need a lawyer if I choose mediation?",
		"Will I have to hire an attorney?",
		"Need a lawyer?",
		"Do I need an attorney?",
		"Can I use mediation without a lawyer?",
		"Should I consult a lawyer during mediation?",
		"Do both spouses need lawyers?",
		"Is hiring a lawyer mandatory?"
	],

	FAQ004: [
		"Can mediation work if my spouse refuses?",
		"What if my partner doesn't want to participate?",
		"What if they say no?",
		"What if my spouse refuses?",
		"What happens if the other person won't participate?",
		"Can I start mediation if my spouse is hesitant?",
		"What if my ex refuses mediation?",
		"Does my spouse have to agree to mediation?"
	],

	FAQ005: [
		"Is mediation suitable if there has been domestic abuse?",
		"Is mediation appropriate where there has been domestic violence?",
		"Can mediation be used when there is a history of domestic abuse?",
		"Is divorce mediation suitable in situations involving abuse?",
		"Can I use mediation if I have experienced abuse?",
		"Is mediation safe when abuse has occurred?",
		"Can couples with a history of abuse use mediation?"
	],

	FAQ006: [
		"What happens when my spouse and I disagree?",
		"What if we disagree?",
		"What if we cannot agree?",
		"What happens if mediation doesn't resolve everything?",
		"What if we can't settle all the issues?",
		"What happens if mediation does not work?",
		"What if we reach an agreement on only some issues?",
		"What happens if we cannot settle?"
	],

	FAQ007: [
		"Is mediation cheaper than going to court?",
		"Is it expensive?",
		"How much does it cost?",
		"What are the mediation fees?",
		"How expensive is divorce mediation?",
		"What should I expect to pay for mediation?",
		"How much money do I need for mediation?",
		"What is the price of mediation?"
	],

	FAQ008: [
		"Are mediation agreements legally binding?",
		"Can a mediation agreement be enforced?",
		"Is it legally binding?",
		"Will our agreement be enforceable?",
		"Do mediation agreements become legally enforceable?",
		"Does the court recognize mediation agreements?",
		"Will our settlement agreement be binding?",
		"Are agreements reached in mediation enforceable?"
	]
};


// ============================================================
// CHATBOT RESPONSES
// ============================================================

const HELP_MESSAGE = `I can help with questions covered by The Clean Divorce's approved FAQs.

Try asking:
• What is divorce mediation?
• How long does mediation usually take?
• Do I still need a lawyer?
• What if my spouse will not agree to mediation?
• Is mediation appropriate if there has been domestic abuse?
• What happens if we cannot reach an agreement?
• How much does divorce mediation cost?
• Will our mediation agreements be legally binding?

I can only provide saved FAQ information, not personalized legal advice. Please contact The Clean Divorce team or request a free consultation for questions not covered by our FAQs.`;

const GREETING_MESSAGE = `Hello! I'm The Clean Divorce FAQ assistant. I can answer questions using our approved FAQs about divorce mediation, the process, costs, lawyers, and agreements. Type "help" to see example questions.`;

const OUT_OF_SCOPE_MESSAGE = `I'm sorry, but I can only assist with questions related to The Clean Divorce and its mediation services.`;

const FAQ_NOT_FOUND_MESSAGE = `I couldn't find a sufficiently close match in the approved FAQ answers. Please contact The Clean Divorce team or request a free consultation for assistance.`;

const SAFETY_MESSAGE = `Your safety matters. If you are in immediate danger, contact local emergency services now. If possible, reach out to someone you trust or a local support service. This chatbot cannot assess emergencies or provide immediate assistance.`;

const FAQ_DATA_ERROR_MESSAGE = `The approved FAQ information could not be loaded. Please check the project files and try again.`;

const MODEL_ERROR_MESSAGE = `I'm sorry, but the FAQ assistant couldn't complete the matching process. Please contact The Clean Divorce team or request a free consultation for assistance.`;


// ============================================================
// DOMAIN KEYWORDS
// ============================================================

const DOMAIN_TERMS = [
	"divorce",
	"divorced",
	"divorcing",
	"mediation",
	"mediate",
	"mediator",
	"separation",
	"separated",
	"separating",
	"spouse",
	"husband",
	"wife",
	"custody",
	"child support",
	"parenting",
	"alimony",
	"divorce papers",
	"divorce decree",
	"family law",
	"ex husband",
	"ex wife",
	"ex spouse",
	"marital home",
	"separation agreement",
	"settlement agreement"
];


// ============================================================
// HTML ELEMENTS
// ============================================================

const elements = {
	form: document.getElementById("chat-form"),
	input: document.getElementById("question-input"),
	send: document.getElementById("send-button"),
	messages: document.getElementById("messages"),
	statusDot: document.getElementById("status-dot"),
	statusText: document.getElementById("status-text"),
	debugCheckbox: document.getElementById("debug-checkbox"),
	debugPanel: document.getElementById("debug-panel"),
	debugSummary: document.getElementById("debug-summary"),
	debugCandidates: document.getElementById("debug-candidates"),
	quickQuestions: document.getElementById("quick-questions")
};


// ============================================================
// APPLICATION STATE
// ============================================================

let faqItems = [];
let faqSearchEntries = [];
let faqSearchEmbeddings = [];
let faqLoadError = null;

let transformersModulePromise = null;
let spellingDictionaryPromise = null;
let embeddingLoadPromise = null;
let crossEncoderLoadPromise = null;

let embeddingPipeline = null;
let crossEncoderTokenizer = null;
let crossEncoderModel = null;

let isProcessing = false;

let latestDebug = {
	summary: "No question has been processed yet.",
	candidates: []
};


// ============================================================
// BASIC CHAT FUNCTIONS
// ============================================================

function setStatus(message, state = "") {
	elements.statusText.textContent = message;
	elements.statusDot.className =
		"status-dot" + (state ? " " + state : "");
}

function addMessage(text, sender = "bot") {
	const message = document.createElement("div");

	message.className = "message " + sender;
	message.textContent = text;

	elements.messages.appendChild(message);
	elements.messages.scrollTop = elements.messages.scrollHeight;
}

function showDebug(summary, candidates = []) {
	latestDebug = { summary, candidates };
	renderDebug();
}

function renderDebug() {
	if (!elements.debugCheckbox.checked) return;

	elements.debugSummary.textContent = latestDebug.summary;
	elements.debugCandidates.replaceChildren();

	for (const candidate of latestDebug.candidates) {
		const item = document.createElement("div");
		item.className = "debug-candidate";

		const title = document.createElement("strong");

		title.textContent =
			candidate.faq.id + " — " + candidate.faq.question;

		const details = document.createElement("span");

		const cosineText =
			"Cosine similarity: " + candidate.cosine.toFixed(4);

		const matchedText = candidate.matchedQuestion
			? " | Matched wording: " + candidate.matchedQuestion
			: "";

		const crossText = Number.isFinite(candidate.crossScore)
			? " | Cross-Encoder score: " + candidate.crossScore.toFixed(4)
			: " | Cross-Encoder: not run";

		details.textContent =
			cosineText + matchedText + crossText;

		item.append(title, details);
		elements.debugCandidates.appendChild(item);
	}
}

function normalizeQuestion(question) {
	return String(question ?? "")
		.toLowerCase()
		.normalize("NFKC")
		.replace(/[’‘]/g, "'")
		.replace(/[^\p{L}\p{N}\s'-]/gu, " ")
		.replace(/\s+/g, " ")
		.trim();
}


// ============================================================
// SAFETY DETECTION
// Runs on the original question before normal FAQ matching.
// ============================================================

function containsSafetyConcern(question) {
	const text = normalizeQuestion(question)
		.replace(/\bi'm\b/g, "i am")
		.replace(/\bim\b/g, "i am")
		.replace(/\bi've\b/g, "i have")
		.replace(/\bdon't\b/g, "do not")
		.replace(/\bdoesn't\b/g, "does not")
		.replace(/\bcan't\b/g, "cannot");

	const safetyPatterns = [

		// Direct danger statements.
		/\b(?:i am|we are|someone is|somebody is|my child is|my children are|a child is)\s+(?:(?:currently|right now)\s+)?(?:in\s+)?(?:immediate\s+)?danger\b/,
		/\b(?:in immediate danger|in danger right now|unsafe right now)\b/,
		/\bi am in an? (?:unsafe|dangerous) situation\b/,

		// Feeling unsafe.
		/\b(?:i do not feel safe|we do not feel safe|i feel unsafe|we feel unsafe|i am not safe|we are not safe|i am unsafe|we are unsafe|fear for my safety)\b/,
		/\bi feel unsafe around (?:my|our)\s+(?:spouse|partner|husband|wife)\b/,
		/\b(?:i am|we are)\s+(?:afraid|scared|frightened)\s+(?:for my|for our)\s+(?:safety|life)\b/,
		/\b(?:i am|we are)\s+(?:afraid|scared|frightened)\s+of\s+(?:my|our)\s+(?:spouse|partner|husband|wife|ex)\b/,

		// Threats, abuse, or harm.
		/\b(?:i am|we are)\s+being\s+(?:threatened|hurt|harmed|attacked|abused|stalked)\b/,
		/\b(?:someone|somebody|he|she|they)\s+(?:(?:is|are|has been|have been|was|were)\s+)?(?:threatening|threatened|hurting|hurt|harming|harmed|attacking|attacked|abusing|abused|stalking|stalked|following|followed)\s+me\b/,
		/\b(?:my|our|former|ex)\s+(?:spouse|partner|husband|wife)\s+(?:is|has been|was)\s+(?:threatening|threatened|abusive|abusing|hurting|hitting|violent|controlling|stalking)\b/,
		/\b(?:my|our|former|ex)\s+(?:spouse|partner|husband|wife)\s+has been abusive\b/,

		// Child safety.
		/\b(?:my|our)\s+children?\b.{0,60}\b(?:in danger|unsafe|at risk|being hurt|being harmed|being threatened|being abused)\b/,
		/\b(?:i am|i feel|i'm)\s+(?:worried|concerned|afraid)\s+about\s+(?:my|our)\s+child(?:ren)?'s\s+safety\b/,

		// Personal self-harm or suicidal thoughts.
		/\b(?:i want to|i am thinking about|i might|i may|i plan to)\s+(?:hurt|harm)\s+myself\b/,
		/\b(?:i want to|i am thinking about|i might|i may)\s+(?:end my life|kill myself)\b/,
		/\b(?:i am|i'm)\s+thinking about\s+(?:suicide|self[- ]harm)\b/
	];

	return safetyPatterns.some(pattern => pattern.test(text));
}


// ============================================================
// SPELLING CORRECTION — TYPO.JS
// ============================================================

async function loadSpellingDictionary() {
	if (spellingDictionaryPromise) {
		return spellingDictionaryPromise;
	}

	spellingDictionaryPromise = (async () => {
		if (typeof window.Typo !== "function") {
			throw new Error("Typo.js did not load.");
		}

		const folder = TYPO_DICTIONARY_PATH + "/en_US";

		const [affResponse, dicResponse] = await Promise.all([
			fetch(folder + "/en_US.aff"),
			fetch(folder + "/en_US.dic")
		]);

		if (!affResponse.ok || !dicResponse.ok) {
			throw new Error("The English spelling dictionary could not be downloaded.");
		}

		const [affData, dicData] = await Promise.all([
			affResponse.text(),
			dicResponse.text()
		]);

		const dictionary = new window.Typo(
			"en_US",
			affData,
			dicData
		);

		if (!dictionary.loaded) {
			throw new Error("The English spelling dictionary did not initialize.");
		}

		return dictionary;
	})().catch(error => {
		spellingDictionaryPromise = null;
		throw error;
	});

	return spellingDictionaryPromise;
}


// Adjacent swapped letters count as one error.
// Example: hlep -> help.

function editDistance(first, second) {
	const rows = first.length + 1;
	const columns = second.length + 1;

	const table = Array.from(
		{ length: rows },
		() => Array(columns).fill(0)
	);

	for (let row = 0; row < rows; row++) {
		table[row][0] = row;
	}

	for (let column = 0; column < columns; column++) {
		table[0][column] = column;
	}

	for (let row = 1; row < rows; row++) {
		for (let column = 1; column < columns; column++) {
			const cost =
				first[row - 1] === second[column - 1] ? 0 : 1;

			table[row][column] = Math.min(
				table[row - 1][column] + 1,
				table[row][column - 1] + 1,
				table[row - 1][column - 1] + cost
			);

			if (
				row > 1 &&
				column > 1 &&
				first[row - 1] === second[column - 2] &&
				first[row - 2] === second[column - 1]
			) {
				table[row][column] = Math.min(
					table[row][column],
					table[row - 2][column - 2] + 1
				);
			}
		}
	}

	return table[first.length][second.length];
}

function preserveWordCase(original, replacement) {
	if (original === original.toUpperCase()) {
		return replacement.toUpperCase();
	}

	if (original[0] === original[0].toUpperCase()) {
		return replacement.charAt(0).toUpperCase() + replacement.slice(1);
	}

	return replacement;
}

async function correctSpelling(question) {
	try {
		const dictionary = await loadSpellingDictionary();

		const tokens =
			question.match(/[A-Za-z]+|[^A-Za-z]+/g) || [];

		const corrections = [];

		const correctedTokens = tokens.map(token => {
			if (
				!/^[A-Za-z]{4,}$/.test(token) ||
				token === token.toUpperCase()
			) {
				return token;
			}

			const word = token.toLowerCase();

			if (dictionary.check(word)) {
				return token;
			}

			const suggestions = dictionary.suggest(word, 5);
			const maxDistance = word.length >= 8 ? 2 : 1;

			const suggestion = suggestions
				.map((candidate, index) => ({
					word: candidate,
					distance: typeof candidate === "string"
						? editDistance(word, candidate.toLowerCase())
						: Number.POSITIVE_INFINITY,
					index
				}))
				.filter(item =>
					typeof item.word === "string" &&
					item.distance <= maxDistance
				)
				.sort((a, b) =>
					a.distance - b.distance || a.index - b.index
				)[0]?.word;

			if (!suggestion) return token;

			const corrected = preserveWordCase(token, suggestion);

			corrections.push({
				original: token,
				corrected
			});

			return corrected;
		});

		return {
			text: correctedTokens.join(""),
			corrections,
			available: true
		};
	} catch (error) {
		console.warn("Typo.js is unavailable; original wording will be used.", error);

		return {
			text: question,
			corrections: [],
			available: false
		};
	}
}


// ============================================================
// HELP AND GREETING COMMANDS
// ============================================================

function isHelpRequest(question) {
	const text = normalizeQuestion(question);
	const words = text.split(" ").filter(Boolean);

	// Recognize a one-letter mistake or adjacent swapped letters in "help".
	if (
		words.length === 1 &&
		editDistance(words[0], "help") <= 1
	) {
		return true;
	}

	if (
		words.length === 2 &&
		words[1] === "me" &&
		editDistance(words[0], "help") <= 1
	) {
		return true;
	}

	const patterns = [
		/^(?:please\s+)?help(?:\s+me)?(?:\s+please)?$/,
		/^(?:i\s+)?need\s+help(?:\s+please)?$/,
		/^can\s+you\s+help(?:\s+me)?$/,
		/^what\s+can\s+i\s+ask(?:\s+you)?$/,
		/^what\s+questions\s+can\s+i\s+ask(?:\s+you)?$/,
		/^what\s+can\s+you\s+do$/,
		/^what\s+topics\s+do\s+you\s+cover$/,
		/^(?:show|give)\s+(?:me\s+)?examples$/
	];

	return patterns.some(pattern => pattern.test(text));
}

function isGreeting(question) {
	return /^(hi|hello|hey|good morning|good afternoon|good evening|hi there|hello there)$/.test(
		normalizeQuestion(question)
	);
}


// ============================================================
// UNSUPPORTED SPECIFIC REQUESTS
// These are related to divorce but are not answered by the FAQs.
// ============================================================

function isUnsupportedSpecificRequest(question) {
	const text = normalizeQuestion(question);

	const patterns = [
		/\bhow long\b.{0,70}\bdivorc\w*\b.{0,50}\b(?:court|litigation|trial)\b/,
		/\bhow long\b.{0,70}\b(?:court|litigation|trial)\b.{0,50}\bdivorc\w*\b/,
		/\b(?:calculate|work out|figure out|estimate)\b.{0,60}\bchild support\b/,
		/\b(?:recommend|suggest|find|choose)\b.{0,60}\b(?:divorce\s+)?(?:lawyer|attorney)s?\b/,
		/\b(?:file|submit|serve)\b.{0,60}\bdivorce papers\b/,
		/\bguarantee\b.{0,70}\b(?:spouse|partner|agree|participate)\b/
	];

	return patterns.some(pattern => pattern.test(text));
}


// ============================================================
// DOMAIN CHECK
// ============================================================

function hasDomainSignal(question) {
	const text = normalizeQuestion(question);

	return DOMAIN_TERMS.some(term => {
		const escaped = term
			.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
			.replace(/\s+/g, "\\s+");

		return new RegExp("\\b" + escaped + "\\b", "i").test(text);
	});
}


// ============================================================
// COSINE SIMILARITY
// ============================================================

function cosineSimilarity(a, b) {
	if (!a || !b || a.length !== b.length || a.length === 0) {
		throw new Error("Cannot compare embedding vectors with different dimensions.");
	}

	let dot = 0;
	let normA = 0;
	let normB = 0;

	for (let index = 0; index < a.length; index++) {
		dot += a[index] * b[index];
		normA += a[index] * a[index];
		normB += b[index] * b[index];
	}

	const denominator = Math.sqrt(normA) * Math.sqrt(normB);

	return denominator === 0 ? 0 : dot / denominator;
}


// ============================================================
// LOAD ORIGINAL APPROVED FAQ DATA
// No original question or answer is modified.
// ============================================================

async function loadFaqData() {
	const response = await fetch("./data/faqs.json", {
		cache: "no-store"
	});

	if (!response.ok) {
		throw new Error(
			"Could not load FAQ data (HTTP " + response.status + ")."
		);
	}

	const data = await response.json();

	if (!Array.isArray(data)) {
		throw new Error("FAQ data must be a JSON array.");
	}

	faqItems = data.filter(item =>
		item &&
		typeof item.id === "string" &&
		typeof item.question === "string" &&
		item.question.trim() &&
		typeof item.answer === "string" &&
		item.answer.trim() &&
		item.status === "approved"
	);

	if (faqItems.length === 0) {
		throw new Error("No approved FAQ entries were found.");
	}

	// Combine original questions with internal alternative search phrases.
	// All entries point back to the original approved FAQ object.

	faqSearchEntries = faqItems.flatMap(faq => {
		const alternatives = FAQ_ALTERNATIVES[faq.id] || [];

		const phrases = [
			faq.question,
			...alternatives
		];

		const uniquePhrases = [
			...new Set(
				phrases
					.map(phrase => normalizeQuestion(phrase))
					.filter(Boolean)
			)
		];

		return uniquePhrases.map(phrase => ({
			faq,
			matchedQuestion: phrase
		}));
	});
}


// ============================================================
// TRANSFORMERS.JS
// ============================================================

async function getTransformersModule() {
	if (!transformersModulePromise) {
		transformersModulePromise = import(TRANSFORMERS_MODULE_URL)
			.then(module => {
				if (
					typeof module.pipeline !== "function" ||
					typeof module.AutoTokenizer?.from_pretrained !== "function" ||
					typeof module.AutoModelForSequenceClassification?.from_pretrained !== "function"
				) {
					throw new Error("Transformers.js did not provide the required model functions.");
				}

				return module;
			})
			.catch(error => {
				transformersModulePromise = null;
				throw error;
			});
	}

	return transformersModulePromise;
}


// ============================================================
// LOAD EMBEDDING MODEL AND FAQ EMBEDDINGS
// ============================================================

async function loadEmbeddingModel() {
	if (embeddingLoadPromise) {
		return embeddingLoadPromise;
	}

	embeddingLoadPromise = (async () => {
		const { pipeline } = await getTransformersModule();

		setStatus(
			"Loading the embedding model. The first download may take a while.",
			"busy"
		);

		embeddingPipeline = await pipeline(
			"feature-extraction",
			EMBEDDING_MODEL
		);

		setStatus(
			"Preparing original and alternative FAQ embeddings...",
			"busy"
		);

		const result = await embeddingPipeline(
			faqSearchEntries.map(entry => entry.matchedQuestion),
			{
				pooling: "mean",
				normalize: true
			}
		);

		faqSearchEmbeddings = result.tolist();

		if (
			faqSearchEmbeddings.length !== faqSearchEntries.length ||
			faqSearchEmbeddings.some(vector => vector.length !== 384)
		) {
			throw new Error("The embedding model returned an unexpected vector size.");
		}
	})().catch(error => {
		embeddingLoadPromise = null;
		embeddingPipeline = null;
		faqSearchEmbeddings = [];
		throw error;
	});

	return embeddingLoadPromise;
}


// ============================================================
// LOAD CROSS-ENCODER
// ============================================================

async function loadCrossEncoder() {
	if (crossEncoderLoadPromise) {
		return crossEncoderLoadPromise;
	}

	crossEncoderLoadPromise = (async () => {
		const {
			AutoTokenizer,
			AutoModelForSequenceClassification
		} = await getTransformersModule();

		setStatus("Loading the Cross-Encoder model...", "busy");

		crossEncoderTokenizer = await AutoTokenizer.from_pretrained(
			CROSS_ENCODER_MODEL
		);

		crossEncoderModel = await AutoModelForSequenceClassification.from_pretrained(
			CROSS_ENCODER_MODEL
		);
	})().catch(error => {
		crossEncoderLoadPromise = null;
		crossEncoderTokenizer = null;
		crossEncoderModel = null;
		throw error;
	});

	return crossEncoderLoadPromise;
}


// ============================================================
// FIND BEST MATCHING PHRASE FOR EACH FAQ
// Prevents one FAQ from filling all candidate positions.
// ============================================================

function findBestCandidatePerFaq(questionVector) {
	const bestMatches = new Map();

	for (let index = 0; index < faqSearchEntries.length; index++) {
		const entry = faqSearchEntries[index];

		const cosine = cosineSimilarity(
			questionVector,
			faqSearchEmbeddings[index]
		);

		const existing = bestMatches.get(entry.faq.id);

		if (!existing || cosine > existing.cosine) {
			bestMatches.set(entry.faq.id, {
				faq: entry.faq,
				matchedQuestion: entry.matchedQuestion,
				cosine,
				crossScore: Number.NaN
			});
		}
	}

	return [...bestMatches.values()]
		.sort((a, b) => b.cosine - a.cosine)
		.slice(0, Math.min(CANDIDATE_COUNT, faqItems.length));
}


// ============================================================
// CROSS-ENCODER RERANKING
// ============================================================

async function rerankCandidates(question, candidates) {
	const features = crossEncoderTokenizer(
		candidates.map(() => question),
		{
			text_pair: candidates.map(candidate => candidate.matchedQuestion),
			padding: true,
			truncation: true
		}
	);

	const output = await crossEncoderModel(features);
	const scores = Array.from(output.logits.data);

	if (scores.length !== candidates.length) {
		throw new Error("The Cross-Encoder returned an unexpected number of scores.");
	}

	return candidates
		.map((candidate, index) => ({
			...candidate,
			crossScore: scores[index]
		}))
		.sort((a, b) => b.crossScore - a.crossScore);
}


// ============================================================
// MAIN QUESTION PROCESSING
// ============================================================

async function processQuestion(question) {
	const originalQuestion = normalizeQuestion(question);

	// PRIORITY 1: Safety check on the original user wording.

	if (containsSafetyConcern(originalQuestion)) {
		showDebug(
			"SAFETY OVERRIDE: a personal safety concern was detected. FAQ matching was skipped."
		);

		addMessage(SAFETY_MESSAGE);
		setStatus("Safety response displayed. Normal matching was skipped.", "ready");
		return;
	}

	// PRIORITY 2: Local help and greeting commands.

	if (isHelpRequest(originalQuestion)) {
		showDebug("HELP COMMAND: local help information was displayed.");
		addMessage(HELP_MESSAGE);
		setStatus("Help information displayed.", "ready");
		return;
	}

	if (isGreeting(originalQuestion)) {
		showDebug("GREETING: local greeting response was displayed.");
		addMessage(GREETING_MESSAGE);
		setStatus("Ready for a question about The Clean Divorce.", "ready");
		return;
	}

	if (faqLoadError || faqItems.length === 0) {
		showDebug("FAQ DATA ERROR: approved FAQ data is unavailable.");
		addMessage(FAQ_DATA_ERROR_MESSAGE);
		setStatus("Approved FAQ data is unavailable.", "error");
		return;
	}

	// PRIORITY 3: Correct spelling.
	// The original question remains available for the safety check.

	setStatus("Checking spelling...", "busy");

	const spellingResult = await correctSpelling(question);

	const matchingQuestion = normalizeQuestion(
		spellingResult.text || question
	);

	const correctionSummary = spellingResult.corrections.length
		? " | Spelling corrections: " +
			spellingResult.corrections
				.map(item => item.original + " → " + item.corrected)
				.join(", ")
		: (
			spellingResult.available
				? " | Spelling corrections: none"
				: " | Spellchecker unavailable; original wording used"
		);

	// Safety check again after spelling correction.

	if (containsSafetyConcern(matchingQuestion)) {
		showDebug(
			"SAFETY OVERRIDE: corrected wording triggered a safety check." +
			correctionSummary
		);

		addMessage(SAFETY_MESSAGE);
		setStatus("Safety response displayed. Normal matching was skipped.", "ready");
		return;
	}

	if (isHelpRequest(matchingQuestion)) {
		showDebug("HELP COMMAND: local help information was displayed." + correctionSummary);
		addMessage(HELP_MESSAGE);
		setStatus("Help information displayed.", "ready");
		return;
	}

	if (isGreeting(matchingQuestion)) {
		showDebug("GREETING: local greeting response was displayed." + correctionSummary);
		addMessage(GREETING_MESSAGE);
		setStatus("Ready for a question about The Clean Divorce.", "ready");
		return;
	}

	// PRIORITY 4: Reject specific requests not covered by approved FAQs.

	if (isUnsupportedSpecificRequest(matchingQuestion)) {
		showDebug(
			"RELATED BUT NOT COVERED: the question requests information outside the approved FAQ answers." +
			correctionSummary
		);

		addMessage(FAQ_NOT_FOUND_MESSAGE);
		setStatus("No approved FAQ covers this specific request.", "ready");
		return;
	}

	try {
		// PRIORITY 5: Embedding matching.

		await loadEmbeddingModel();

		setStatus(
			"Comparing your question with approved FAQ questions...",
			"busy"
		);

		const questionResult = await embeddingPipeline(
			matchingQuestion,
			{
				pooling: "mean",
				normalize: true
			}
		);

		const questionVector = questionResult.tolist()[0];

		const candidates = findBestCandidatePerFaq(questionVector);

		const bestCosine = candidates[0]?.cosine ?? 0;
		const hasDomainKeyword = hasDomainSignal(matchingQuestion);

		const passesSemanticScope =
			bestCosine >= MIN_SCOPE_SIMILARITY;

		// Domain keywords alone do not approve an FAQ answer.

		if (!hasDomainKeyword && !passesSemanticScope) {
			showDebug(
				"OUT OF SCOPE | Domain keyword: no | Best cosine: " +
				bestCosine.toFixed(4) +
				" | Scope minimum: " +
				MIN_SCOPE_SIMILARITY.toFixed(2) +
				correctionSummary,
				candidates
			);

			addMessage(OUT_OF_SCOPE_MESSAGE);
			setStatus("Question appears to be outside The Clean Divorce scope.", "ready");
			return;
		}

		// PRIORITY 6: Cross-Encoder reranking.

		await loadCrossEncoder();

		setStatus("Re-ranking the closest approved FAQ matches...", "busy");

		const rankedCandidates = await rerankCandidates(
			matchingQuestion,
			candidates
		);

		const bestMatch = rankedCandidates[0];

		const passesFaqSimilarity =
			bestMatch.cosine >= MIN_FAQ_COSINE_SCORE;

		const passesCrossEncoder =
			bestMatch.crossScore >= CROSS_ENCODER_SCORE_THRESHOLD;

		const accepted =
			passesFaqSimilarity && passesCrossEncoder;

		showDebug(
			"IN SCOPE | Domain keyword: " +
			(hasDomainKeyword ? "yes" : "no") +
			" | Best cosine: " +
			bestCosine.toFixed(4) +
			" | FAQ cosine minimum: " +
			MIN_FAQ_COSINE_SCORE.toFixed(2) +
			" | Selected: " +
			bestMatch.faq.id +
			" | Matched wording: " +
			bestMatch.matchedQuestion +
			" | Cross-Encoder score: " +
			bestMatch.crossScore.toFixed(4) +
			" | Cross-Encoder threshold: " +
			CROSS_ENCODER_SCORE_THRESHOLD.toFixed(2) +
			" | Decision: " +
			(accepted ? "ACCEPTED" : "FAQ NOT FOUND") +
			correctionSummary,
			rankedCandidates
		);

		// Always return the ORIGINAL approved answer from faqs.json.

		if (accepted) {
			addMessage(bestMatch.faq.answer);
			setStatus("An approved FAQ answer was returned.", "ready");
		} else {
			addMessage(FAQ_NOT_FOUND_MESSAGE);
			setStatus("No candidate passed the acceptance thresholds.", "ready");
		}

	} catch (error) {
		console.error("TCD FAQ assistant error:", error);

		showDebug(
			"MODEL ERROR: " +
			(error?.message || String(error)) +
			". No FAQ answer was returned." +
			correctionSummary
		);

		addMessage(MODEL_ERROR_MESSAGE);
		setStatus("A model failed to load or run. Check the browser console.", "error");
	}
}


// ============================================================
// FORM SUBMISSION
// ============================================================

async function handleSubmit(event) {
	event.preventDefault();

	const question = elements.input.value.trim();

	if (!question || isProcessing) return;

	addMessage(question, "user");
	elements.input.value = "";

	isProcessing = true;
	elements.send.disabled = true;
	elements.input.disabled = true;

	try {
		await processQuestion(question);
	} finally {
		isProcessing = false;
		elements.send.disabled = false;
		elements.input.disabled = false;
		elements.input.focus();
	}
}


// ============================================================
// QUICK QUESTIONS
// ============================================================

function handleQuickQuestionClick(event) {
	const button = event.target.closest("button");

	if (!button) return;

	elements.input.value = button.textContent.trim();
	elements.input.focus();
}


// ============================================================
// DEBUG MODE
// ============================================================

function handleDebugToggle() {
	elements.debugPanel.classList.toggle(
		"visible",
		elements.debugCheckbox.checked
	);

	renderDebug();
}


// ============================================================
// INITIALIZATION
// ============================================================

async function initialize() {
	// Register event handlers before loading FAQ data.
	elements.form.addEventListener("submit", handleSubmit);

	elements.quickQuestions.addEventListener(
		"click",
		handleQuickQuestionClick
	);

	elements.debugCheckbox.addEventListener(
		"change",
		handleDebugToggle
	);

	try {
		await loadFaqData();

		setStatus(
			faqItems.length +
			" approved FAQ entries loaded. Alternative phrasings are ready for matching.",
			"ready"
		);

	} catch (error) {
		faqLoadError = error;

		console.error("TCD FAQ data error:", error);

		setStatus(
			"FAQ data could not be loaded. Local help and safety commands are still available.",
			"error"
		);

		addMessage(
			'The approved FAQ file could not be loaded. You can still type "help" to see available topics.'
		);
	}
}

initialize();
