# TikTok: "Pranked for 4 months" (Rasmus Wallbridge / TV 2)

A 9:16 motion-graphics news video built with Remotion. The voiceover is from
ElevenLabs, and the script and caption follow the `tiktok-skills` bundle
(`tt-hook-scripter`, `tt-humanizer`, `tt-caption-writer`).

Length: about 58 s (56.7 s voiceover + 1.2 s tail). 1080x1920, 30 fps.

## Finish the video (add the voiceover)

1. Download the ElevenLabs take to `public/voiceover.mp3`
   (flow: https://elevenlabs.io/app/flows/b28xS4L8fBz8k6BV2plE, take 1,
   voice "James - Natural. Conversational, Warm", model eleven_v4).
2. `npm install`
3. `npm run sync` times each scene to the real pauses in the voiceover and
   turns the audio track on.
4. `npm run render` writes `out/rasmus-prank.mp4`.

`npm run studio` opens the Remotion editor for tweaks.

## Hook (tt-hook-scripter)

- **Formula:** T8 Story In Medias Res, with a T4 open-loop close. Goal: comments.
- **Spoken line:** "Imagine spending four months making a movie.. that was never real. And everyone around you was in on it."
- **On-screen text:** PRANKED FOR 4 MONTHS
- **Opening visual:** the number counting up to 4 inside a hidden-camera REC frame. No intro.
- **Loop close:** it ends on the two-choice poll card, and the REC frame carries straight back into the opening.

## Voiceover script (humanizer pass done)

> Imagine spending four months making a movie.. that was never real. And everyone around you was in on it.
> That's what happened to Danish comedian Rasmus Wallbridge.
> He thought he was developing a film with his friend, Martin Johannes Larsen. Hidden cameras filmed him the whole time.
> TV 2 turned it into a show called Alle elsker Rasmus. That means, Everyone Loves Rasmus.
> It came out on October 26th, and people instantly called it bullying.
> Even Denmark's culture minister said TV 2 broke its own guidelines.
> Five days later, TV 2 pulled the show from every platform, and gave him an unconditional apology.
> TV 2 says Rasmus got the final say on whether it aired. He's barely spoken since. He just asked them never to make a show like this again.
> So.. harmless prank, or did TV 2 go way too far? Tell me what you think in the comments.

## Caption (tt-caption-writer)

```
Harmless prank or way too far? 👇

Danish comedian Rasmus Wallbridge spent 4 months thinking he was developing a film. It was a hidden camera show. TV 2 aired it on Oct 26, pulled it on Oct 31 after the backlash, and apologised to him unconditionally.

#denmark #hiddencamera #prank #tv2 #comedian
```

About 330 characters, well under the 2,200 cap.

**Settings:** `PUBLIC_TO_EVERYONE`, comments on, duet off, stitch on (a
reaction-friendly story), no commercial flags. Publora can invert the
comment/duet/stitch flags, so test with a `SELF_ONLY` draft first.

## Fact check

Every claim in the script comes from reporting dated 26 to 31 October 2026:

- TV 2: [TV 2 pulls the show and apologises](https://underholdning.tv2.dk/2026-10-31-tv-2-traekker-alle-elsker-rasmus-tilbage-og-sender-undskyldning), [live blog](https://underholdning.tv2.dk/live/2026-10-31-tv-2-traekker-alle-elsker-rasmus-tilbage)
- DR: [culture minister says TV 2 broke its guidelines](https://www.dr.dk/nyheder/kultur/kulturminister-om-alle-elsker-rasmus-tv-2-har-brudt-deres-egne-retningslinjer), ["I think it's bullying"](https://www.dr.dk/nyheder/indland/tv-2-program-vaekker-vrede-jeg-synes-det-er-mobning), [Wallbridge's Instagram post](https://www.dr.dk/nyheder/kultur/komiker-rasmus-wallbridge-bryder-tavsheden-med-instagram-opslag)
- [tvguide.dk listing](https://www.tvguide.dk/titler/1038272/alle-elsker-rasmus) for the premise and premiere date

Left out on purpose: the "149 people lied to him" figure that one English
article repeats. No primary source confirmed it.
