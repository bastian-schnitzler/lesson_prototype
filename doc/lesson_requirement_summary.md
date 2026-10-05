# 📋 Summary of App Requirements & Lesson Specifications

---

## 1. Core Architecture & Generation Flow

All lesson content is generated through a 3-stage cascade:
$$\text{Outline (Fixed Roadmap)} \longrightarrow \text{Brief (Pedagogical Blueprint)} \longrightarrow \text{Lesson Content (Interactive Screens)}$$

- **Outline (Fixed)**: Defined per language and level (`id`, `kind`, `topic`/`theme`, `workingTitle`, `intent`).
- **Brief (Schema to be finalized)**: Defines the concrete instructional parameters (e.g., number of vocabulary items, teaching blocks, examples, pitfalls).
- **Lesson Content**: The concrete interactive exercise screens delivered to the learner.
- **Target Lesson Duration**: **10 to 15 minutes** across all categories.

---

## 2. The 4 Lesson Categories

1. **Vocabulary**: Defined & structured (see flow below).
2. **Grammar**: Defined & structured (see flow & exercise table below).
3. **Reading**: **Not yet decided** _(current initial idea: display text $\to$ ask question $\to$ display text $\to$ ask question; detailed UX & pedagogy pending)_.
4. **Function**: **Not yet decided** _(communicative speech acts/situational dialogues; detailed UX & pedagogy pending)_.

---

## 3. Vocabulary Lesson Specification

A fixed 6-step sequential progression:

1. **Step 1: Introduction**  
   Presentation of each target vocabulary word with translation, audio, and gender tag.
2. **Step 2: Flipping Cards**  
   Flashcards: Front shows **Mother Tongue**, back reveals **Learning Language** with audio and gender tag.
3. **Step 3: Connect Several Words on One Page**  
   Single-screen matching: Tap words in mother tongue to connect with their learning language equivalents.
4. **Step 4: Vocabulary Overview**  
   Consolidated review screen displaying all vocabulary words introduced in the lesson.
5. **Step 5: Fill in Gap with Active Typing**  
   Context sentence with a blank. **4 choices are shown on screen as reference, but the learner CANNOT click/select them—they must actively type the word** (excluding the article).
6. **Step 6: Final Exam**  
   Mother tongue translation is shown. Learner must write the target word **with its indefinite article** (e.g., `une table` / `un livre`).

> **Gender Rule**:
>
> - **Steps 1 through 5**: Always display the grammatical gender next to the learning language word (e.g., `la table (f)`).
> - **Step 6 (Final Exam)**: **Do NOT show the gender** (this step explicitly tests whether the learner acquired the correct gender and indefinite article).

---

## 4. Grammar Lesson Specification

### 4.1 Lesson Flow

- **Teaching Blocks (Repeated 2 to 4 times)**:
  - **Part A (Explanation)**: Bite-sized grammar explanation. Can be split across blocks if complex; one block can specifically focus on **pitfalls, common errors, or irregular forms**.
  - **Part B (Targeted Exercise)**: Immediate practice reinforcing the explanation from Part A, chosen from the grammar exercise bank.
- **Post-Block Synthesis**:
  - **Personalized Feedback**: Diagnoses the user's specific answers and errors in the preceding blocks and presents a targeted explanation addressing their weaknesses.
  - **Final Exam**: Comprehensive final evaluation covering the lesson (best format is written production/typing where applicable).

---

### 4.2 Grammar Exercise Bank

|   #   | Exercise Type                             | Interaction Mechanics & Details                                                                                                                                                                     |
| :---: | :---------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1** | **Fill in the Gaps (Multiple Choice)**    | Sentence with a blank and **4 answer choices**; learner selects the correct one.                                                                                                                    |
| **2** | **Drag & Drop Word Order**                | Drag and drop word blocks from a source container into the correct grammatical order in the target zone (syntax builder).                                                                           |
| **3** | **Drag & Drop Form to Personal Pronouns** | Drag and drop the correct grammatical forms (e.g., conjugated verb forms or pronouns) to matching personal pronouns (`je`, `tu`, `il/elle`, and plurals `nous`, `vous`, `ils/elles`).               |
| **4** | **Write Form to Personal Pronouns**       | Manually **type** the correct grammatical forms (e.g., verb forms or pronouns) next to each personal pronoun (`je`, `tu`, `il/elle`, and plurals `nous`, `vous`, `ils/elles`).                      |
| **5** | **Phrase with Gaps (Exact Typing)**       | Sentence with a gap where the user must type the exact text. Can have a **hint** (e.g., _"fill in the right form of [verb/pronoun]"_), or **no hint** when the context provides enough information. |
| **6** | **Grammar Bug Hunter (Error Spotter)**    | A sentence with a deliberate grammatical mistake is shown (e.g., an agreement or conjugation error). The learner taps the faulty word to catch the bug and writes or selects the correct form.      |
