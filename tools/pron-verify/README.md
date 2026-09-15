# pron-verify

Checks the AI pronunciation assessment against real Gemini using recordings whose
errors are known in advance.

```
powershell -ExecutionPolicy Bypass -File tools\pron-verify\make_audio.ps1
node tools/pron-verify/verify.mjs
```

Key comes from `GEMINI_API_KEY` or `~/.cadence_gemini_key`. A run costs **8 requests**,
out of a free-tier budget of 20 a day per model — the same budget the app uses.

## Results, 2026-09-15 (gemini-2.5-flash, current prompt)

11 of 13 checks passed on a 10-request run.

| Recording | Result |
|---|---|
| Correct native reading | 95, 95, 98 — nothing flagged |
| Words skipped | 65 — the skipped words are missing from "heard" and flagged |
| Wrong sentence | audible false |
| Silence | audible false |
| Korean-accented reading | 68 — think, third, worth, Thursday flagged; "heard" shows them in Hangul (싱크, 서드) |
| th → t/s substitutions (true, Tursday, sink, tird) | 72, 68, 70 — **only third flagged** |

**The miss that matters.** Substitutions like think → *sink* went unflagged, and "heard"
wrote them back as the correct words. Two follow-up checks located the cause:

- Transcribed **without** the reference text, the sentence still came back corrected. So
  it is not the prompt priming toward the reference.
- The same substitutions spoken as **isolated words** came back as heard: *sink, true,
  tiered* (and *Thursday* for the non-word *Tursday*), versus *think, through, third,
  Thursday* for the correct list.

So the model can hear the difference; inside a sentence it resolves the sounds to the
words the context makes likely. Strong accents, omissions and misreads are caught;
single-consonant swaps that produce another plausible word, in running speech, mostly
are not.

## Open: a candidate prompt change

Not adopted — unverified. The run against it hit the daily quota after one result, and
that one result (the Korean-accented take) was worse: "heard" normalized to the
reference and lost the Hangul renderings. To test it, replace `PRON_SYSTEM` in
`js/pron-prompt.js` with the text below, run `verify.mjs`, and compare to the table.

> …Never report an error you cannot actually hear. Judge the sounds of each word on their
> own: do not let the reference text or the sentence context change what you report
> hearing. A mispronounced word often sounds like a different real word or like a
> non-word, and you must report it that way even when the resulting sentence makes no
> sense. If the recording is silent…

and in the prompt, `heard`: "…word by word as it sounded - keep misread, mispronounced or
skipped words exactly as spoken, never corrected toward the reference".

Given the isolated-word result, a likelier fix for minimal pairs is structural rather
than wording: drill them as words, where the model does hear them.
