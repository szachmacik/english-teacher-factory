# English Teacher Digital Factory — TODO

## 🗄️ Database Schema
- [x] Table: projects (YouTube URL, title, transcript, status, userId, cefrLevel, topics, thumbnailUrl)
- [x] Table: products (projectId, type, title, content JSON, canvaDesignId, canvaEditUrl, pdfUrl, pngUrl, pptxUrl, status)
- [x] Table: games (projectId, type, config JSON, shareToken, plays, isPublic)
- [x] Table: vocabularyItems (projectId, word, partOfSpeech, definition, exampleSentence, polishTranslation, cefrLevel)
- [x] Table: canvaDesigns (productId, designId, designUrl, exportFormat, downloadUrl)
- [x] Table: gameScores (gameId, playerName, score, maxScore, timeSeconds)

## 🔧 Backend — Core Pipeline
- [x] YouTube transcript extraction (youtube-transcript library)
- [x] YouTube metadata extraction (title, thumbnail, videoId)
- [x] AI content analysis (invokeLLM) — extract vocabulary, grammar points, topics, CEFR level
- [x] Product generation orchestrator (pipeline.ts) — 11 products + 6 games in parallel
- [x] tRPC router: projects (create, list, get, delete, getStatus)
- [x] tRPC router: products (get, regenerate, exportCanva)
- [x] tRPC router: games (getByToken, submitScore, getLeaderboard, listByProject)
- [x] tRPC router: canva (exportAll, exportProduct, generateSocialMedia, generateThumbnail)
- [x] tRPC router: stats (overview)
- [x] tRPC router: vocabulary (listByProject)

## 📚 Product Generators (AI-powered) — 11 types
- [x] Worksheet generator (reading comprehension, gap-fill, true/false)
- [x] Vocabulary list generator (word + definition + example + Polish translation)
- [x] Flashcard set generator (front: word, back: definition + example)
- [x] Grammar guide generator (grammar points + explanations + exercises)
- [x] Writing exercise generator (guided writing prompts based on video topic)
- [x] Listening comprehension worksheet (pre/while/post listening tasks)
- [x] Lesson plan generator (full 60-min lesson plan with stages and timing)
- [x] Mini textbook chapter generator (structured reading passage + exercises)
- [x] Discussion questions generator (speaking activities, debate topics)
- [x] Homework assignment generator (tasks for students to do at home)
- [x] Teacher notes generator (background info, tips, differentiation ideas)

## 🎮 Interactive Games — 6 types (playable in browser)
- [x] Quiz game (multiple choice, 10 questions from video content)
- [x] Vocabulary Memory game (flip cards — word/definition pairs)
- [x] Word Matching game (click-to-match word to definition)
- [x] Fill-in-the-Blanks game (sentences from video with missing words)
- [x] Spelling Bee game (hear word, type spelling)
- [x] Sentence Scramble game (unscramble words to form correct sentence)
- [x] Shareable game links (unique token per game, no login required for students)
- [x] Game score tracking and leaderboard

## 🎨 Canva MCP Integration
- [x] Auto-generate Canva worksheet design
- [x] Auto-generate Canva flashcard set design
- [x] Auto-generate Canva vocabulary poster design
- [x] Auto-generate Canva lesson plan design
- [x] Auto-generate Canva social media post (Instagram/Facebook)
- [x] Auto-generate Canva YouTube thumbnail
- [x] Export all Canva designs to PDF
- [x] Export individual product to PDF/PNG/PPTX
- [x] Canva design edit URL (open in Canva)
- [x] Retry logic + async execFile for long sessions

## 🖥️ Frontend — Pages & UI
- [x] Landing page (hero with YouTube URL input, feature showcase, product types)
- [x] Dashboard page (list of all projects with status + stats overview)
- [x] Project detail page (tabs: Products, Games, Vocabulary, Canva Tools)
- [x] Product preview modal (rendered content with full view)
- [x] Game player page (public, shareable — no login needed for students)
- [x] All Products library page (filter by type)
- [x] Games Library page (with leaderboard)
- [x] Settings page (preferences)
- [x] Canva Tools tab (Export All, Social Media, YouTube Thumbnail, per-product)

## 🎨 UI/UX Design
- [x] Dark theme with professional color palette
- [x] Animated progress pipeline (show generation steps live)
- [x] Product cards with type icons and color coding
- [x] Responsive layout (mobile-friendly)
- [x] Toast notifications for generation status
- [x] Loading states for async content
- [x] Color-coded product type badges
- [x] Sidebar navigation (Dashboard, Products, Games, Settings)
- [x] Status banner with step-by-step progress

## 🔐 Auth & User Management
- [x] Protected routes (dashboard, project detail)
- [x] Manus OAuth integration
- [x] User profile in sidebar

## 📦 Export & Delivery
- [x] Individual product export (PDF/PNG/PPTX via Canva)
- [x] Bulk export all products to PDF
- [x] Shareable game links (public, no login)
- [x] Open in Canva (edit URL)

## 🧪 Tests
- [x] Unit tests: tRPC routers (16 tests passing)
- [x] Unit tests: auth logout
- [x] TypeScript: 0 errors

## 🚀 Future Enhancements
- [ ] ZIP download (all products for a project)
- [ ] Shareable preview links for products
- [ ] Print-ready PDF formatting
- [ ] Dark/light mode toggle
- [ ] Admin panel (view all users and projects)
- [ ] More game types (crossword, word search)
- [ ] Custom branding per teacher
- [ ] Marketplace integration (sell products)

## 🔄 Multi-Source Engine (NOWE)
- [x] Source: YouTube URL (istniejące — refactor do unified pipeline)
- [x] Source: PDF upload (wyciąganie tekstu z PDF — podręcznik, artykuł)
- [x] Source: Audio/Podcast upload (transkrypcja Whisper API)
- [x] Source: Image/Screenshot upload (OCR + vision — np. zdjęcie tablicy, strony książki)
- [x] Source: URL strony internetowej (web scraping — artykuł, Wikipedia, BBC Learning English)
- [x] Source: Własny tekst (wklejenie tekstu bezpośrednio)
- [x] Source: AI Topic Generator (podaj temat np. "Present Perfect B2" — AI generuje kontekst)
- [x] Source: Notatka głosowa (nagranie w przeglądarce → Whisper)
- [x] Source: Piosenka/Lyrics (music-based lessons)
- [x] Multi-source combiner (połącz kilka źródeł w jeden projekt)

## 🎯 Konteksty Generowania (NOWE)
- [x] Poziom CEFR (A1-C2) — wybór lub auto-detect
- [x] Wiek uczniów (Kids/Tweens/Teens/Young Adults/Adults/Mixed)
- [x] Typ szkoły (Public/Private/Language/University/Online/Tutoring/Corporate/Homeschool)
- [x] Cel lekcji (10 celów: Vocabulary, Grammar, Reading, Listening, Speaking, Writing, Exam, Culture, Pronunciation, Mixed)
- [x] Styl nauczania (8 metod: Communicative, Grammar-Translation, Task-Based, Flipped, Project-Based, Test Prep, Conversation, Business)
- [ ] Liczba uczniów (indywidualny, para, mała grupa 3-6, klasa 15-30)
- [ ] Czas lekcji (30 min, 45 min, 60 min, 90 min)
- [ ] Język ojczysty uczniów (polski, rosyjski, arabski, chiński, etc.)

## 📦 Nowe Typy Produktów (NOWE)
- [x] Crossword puzzle (krzyżówka ze słownictwa)
- [x] Word Search (szukanie słów w siatce)
- [x] Role-play scenario cards (karty do odgrywania ról)
- [x] Pronunciation guide (wymowa, IPA, minimal pairs)
- [x] Song/lyrics worksheet (jeśli źródłem jest piosenka)
- [x] Debate cards (pro/con argument cards)
- [x] Error correction worksheet (typowe błędy uczniów)
- [x] Reading passage (graded reader — dostosowany do CEFR)
- [x] Assessment rubric (karta oceny dla nauczyciela)
- [x] Parent newsletter (informacja dla rodziców o temacie lekcji)
- [ ] Certificate of completion (certyfikat dla ucznia)
- [ ] Infographic vocabulary (visual vocabulary map)

## 🖼️ AI Image Generation (NOWE)
- [ ] Okładka produktu (AI-generated cover image)
- [ ] Ilustracje do worksheetów
- [ ] Avatary postaci do role-play
- [ ] Tło do prezentacji Canva

## 📤 Export & Marketplace (NOWE)
- [ ] ZIP download (wszystkie produkty projektu)
- [ ] Shareable product preview link (publiczny podgląd)
- [ ] Marketplace card (gotowa karta produktu do Etsy/TPT/Gumroad)
- [ ] Bundle creator (połącz kilka projektów w jeden pakiet)
