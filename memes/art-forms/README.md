# Eight memes, eight art forms

Each meme uses a different medium: a sketchbook page, a linocut print, cross-stitch, a 1930s travel poster, a hand-drawn cartoon in the style of the team's lab-mouse meme, 8-bit pixel art, Pakistani truck art and a Mughal miniature.

`00_contact_sheet.jpg` shows all eight together.

Every caption ends with #xhopememeprize. Every number is sourced at the bottom of this file.

| # | File | Medium | What it says |
|---|---|---|---|
| 1 | `01_sketchbook_things_grandpa_had_to_worry_about.jpg` | Sketchbook page | THINGS GRANDPA HAD TO WORRY ABOUT |
| 2 | `02_linocut_we_bottled_a_star.jpg` | Linocut print | WE BOTTLED A STAR |
| 3 | `03_cross_stitch_bless_this_solar_roof.jpg` | Cross-stitch sampler | BLESS THIS SOLAR ROOF |
| 4 | `04_travel_poster_see_the_milky_way.jpg` | Vintage travel poster | SEE THE MILKY WAY / FROM YOUR OWN BACKYARD |
| 5 | `05_cartoon_factory_reset.jpg` | Hand-drawn cartoon | FACTORY RESET |
| 6 | `06_pixel_boss_rush.png` / `.gif` / `.mp4` | 8-bit pixel art | HUMANITY VS DISEASE: BOSS RUSH |
| 7 | `07_truck_art_maa_ki_dua_saaf_hawa.jpg` | Pakistani truck art | MAA KI DUA, SAAF HAWA |
| 8 | `08_miniature_the_last_polio_drop.jpg` | Mughal miniature | THE LAST POLIO DROP / PAKISTAN, 20__ |

---

## 1. Sketchbook: THINGS GRANDPA HAD TO WORRY ABOUT
> Homework, 2100: "Things Grandpa had to worry about."
> Smog. Power cuts. Malaria. The dentist's drill. Traffic. White coral.
> Each one already has people working on the fix. Pakistan imported about 17 GW of solar panels in 2024. 47 countries are certified malaria-free. A drug to regrow teeth is in human trials in Japan.
> One day, it's all just homework.
> #xhopememeprize #sketchbook #future

## 2. Linocut: WE BOTTLED A STAR
> On 5 December 2022, a lab in California got more energy out of a fusion reaction than its lasers put in: 3.15 megajoules out from 2.05 in. In April 2025 it got 8.6 megajoules out of 2.08, more than four times as much.
> It isn't a power station yet. Running the lasers still takes far more energy from the grid than the shot gives back. But for a split second, people did what the Sun does.
> #xhopememeprize #fusion #energy #linocut #printmaking

## 3. Cross-stitch: BLESS THIS SOLAR ROOF
> Grandma's samplers said "Bless this home." The next generation's will say this.
> In 2024 alone, Pakistan imported about 17 GW of solar panels, five times what it bought in 2022. Families didn't wait for the grid. They put it on the roof.
> #xhopememeprize #solar #crossstitch #embroidery #Pakistan

## 4. Vintage travel poster: SEE THE MILKY WAY FROM YOUR OWN BACKYARD
> Old travel posters sold faraway wonders. This one sells the wonder right over your house.
> More than a third of humanity can no longer see the Milky Way from home, including nearly 80% of North Americans. It doesn't have to stay that way. Flagstaff, Arizona passed its first outdoor-lighting rule in 1958, and in 2001 it became the world's first International Dark Sky City.
> Warm lights, pointed down, switched off when nobody needs them.
> #xhopememeprize #darksky #lightpollution #MilkyWay #vintageposter

## 5. Hand-drawn cartoon: FACTORY RESET
> In 2006, Shinya Yamanaka found four genes that can turn an adult cell back into a stem cell. He won the Nobel Prize for it in 2012.
> In 2020, a Harvard team used three of them, "OSK", to partly reset the eye cells of old mice, and restored their sight.
> In June 2026, the first person got a dose of the same idea, in a safety trial for glaucoma and an optic-nerve stroke called NAION.
> Your cells might come with a factory reset after all.
> #xhopememeprize #longevity #biotech #science

## 6. 8-bit pixel art: HUMANITY VS DISEASE: BOSS RUSH
> HUMANITY VS DISEASE. Current progress:
> Smallpox: beaten in 1980. Rinderpest: beaten in 2011.
> Guinea worm: down from 3.5 million cases a year in 1986 to 10 in 2025.
> Wild polio: cornered in two countries.
> Malaria: 47 countries and one territory certified free. It still killed about 610,000 people in 2024, and funding was $3.9 billion against a $9.3 billion target.
> The bosses can be beaten. Insert coin to continue.
> #xhopememeprize #globalhealth #pixelart #retrogaming

The GIF and MP4 loop the blinking pointer, the flickering last bits of HP and "INSERT COIN". Instagram does not take GIFs, so post the MP4 there.

## 7. Pakistani truck art: MAA KI DUA, SAAF HAWA
> For generations, Pakistan's trucks have carried the same blessing: "Maa ki dua, jannat ki hawa." A mother's prayer is a breeze from heaven.
> The new edition: "Maa ki dua, saaf hawa." A mother's prayer: clean air.
> In November 2024, Lahore's air quality index passed 1,000. Anything over 300 counts as hazardous. Electric trucks, cleaner fuel and fields that aren't burned can make the new slogan come true.
> #xhopememeprize #truckart #Lahore #cleanair #Pakistan

## 8. Mughal miniature: THE LAST POLIO DROP / PAKISTAN, 20__
> Pakistan and Afghanistan are the last two countries where wild polio still spreads. For decades, Pakistan's vaccinators have gone door to door with two drops of vaccine for every child.
> It can be done. In 2021, Pakistan recorded just one case. It climbed to 74 in 2024, then fell to 31 in 2025.
> One day, a vaccinator will give the last drop. This is how history should paint them.
> Fill in the year.
> #xhopememeprize #polio #EndPolio #Pakistan #miniaturepainting

---

## How they were made

- **Pieces 1–5, 7 and 8** are Higgsfield GPT Image 2 stills, made at 2k on the team's free plan. Each cost 2 credits, 14 in all, leaving 5.05. The prompts are in `source/prompts.md`. Every word in them was checked for spelling.
- **The Mughal miniature's lettering** was set in code (`source/make_miniature.py`, Cinzel font), not by the model. The model was asked to leave both panels empty, so the text is spelled exactly.
- **The 8-bit piece** was built pixel by pixel (`source/make_pixel.py`, Press Start 2P font). No AI was used, and every number on it comes from the sources below.
- Both fonts are under the SIL Open Font License, from [Google Fonts](https://github.com/google/fonts). They are in `source/fonts/` with their licences. `source/raw/miniature_polio.jpg` is the miniature before lettering.

**Before posting:** seven of the eight pieces are AI-generated images. If the prize rules or a platform ask about AI use, say so.

## Sources

**Energy and sky**
- Fusion, December 2022: 3.15 MJ out from 2.05 MJ of laser energy: [LLNL](https://lasers.llnl.gov/news/llnls-breakthrough-ignition-experiment-highlighted-in-physical-review-letters).
- Fusion, April 2025: 8.6 MJ from 2.08 MJ, a target gain above four: [LLNL](https://www.llnl.gov/article/52906/llnl-experts-foster-national-fusion-energy-ecosystem-ife-star-conference).
- Pakistan's solar panel imports, about 17 GW in 2024 against 3.3 GW in 2022 (Ember): [Arab News](https://www.arabnews.pk/node/2596952/pakistan), [Express Tribune](https://tribune.com.pk/story/2539779/heres-how-pakistan-quietly-became-worlds-biggest-solar-importer).
- Milky Way hidden from more than a third of humanity and nearly 80% of North Americans (Falchi et al., 2016): [CU Boulder](https://www.colorado.edu/today/2016/06/10/milky-way-now-hidden-one-third-humanity-0).
- Flagstaff's 1958 lighting ordinance and its 2001 designation as the first International Dark Sky City: [DarkSky International](https://darksky.org/places/flagstaff-arizona-dark-sky-community), [Lowell Observatory](https://lowell.edu/discover/dark-skies/).

**Air**
- Lahore's AQI above 1,000 in November 2024: [Dawn](https://www.dawn.com/news/1869475), [Geo](https://www.geo.tv/latest/572962-lahores-aqi-soars-past-1000-again-to-register-worst-air-quality-globally).
- The truck slogan "Maa ki dua jannat ki hawa": [Express Tribune](https://tribune.com.pk/article/22449/pakistan-ko-dekh-magar-pyaar-se), [ARY News](https://arynews.tv/truck-art-paints-the-soul-of-pakistan).

**Biotech and teeth**
- Yamanaka's discovery, Nobel Prize in Physiology or Medicine 2012: [nobelprize.org](https://www.nobelprize.org/prizes/medicine/2012/summary/).
- OSK restored vision in old mice and a glaucoma model (Lu et al., *Nature*, 2020): [Lifespan.io](https://www.lifespan.io/news/reversing-cellular-age-in-mice-restores-vision).
- ER-100, the first partial-reprogramming therapy in people: the FDA cleared the trial in January 2026 ([Longevity.Technology](https://longevity.technology/news/fda-clears-first-human-trial-of-epigenetic-reprogramming-therapy/)), and the first patient was dosed on 9 June 2026 ([Life Biosciences via BioSpace](https://www.biospace.com/press-releases/life-biosciences-announces-first-patient-dosed-in-phase-1-trial-of-er-100-for-optic-neuropathies)).
- First human trial of a tooth-regrowth drug, Kyoto University Hospital: [New Atlas](https://newatlas.com/medical/tooth-regrowing-human-trial).

**Disease**
- Smallpox eradicated in 1980: [WHO](https://www.who.int/health-topics/smallpox).
- Rinderpest declared eradicated in 2011: [UN News](https://news.un.org/en/story/2011/06/379902), [CIDRAP](https://www.cidrap.umn.edu/oie-declares-rinderpest-eradicated).
- Guinea worm, 10 human cases in 2025 (provisional), against more than 3.5 million a year in 1986: [The Carter Center](https://www.cartercenter.org/?p=25301).
- Wild polio endemic only in Pakistan and Afghanistan: [WHO Polio IHR Emergency Committee](https://www.who.int/news/item/11-11-2025-statement-of-the-forty-third-meeting-of-the-polio-ihr-emergency-committee).
- Wild polio in 2024: 74 cases in Pakistan and 25 in Afghanistan: [Health Policy Watch](https://healthpolicy-watch.news/wild-poliovirus-transmission-persists-in-afghanistan-and-pakistan/).
- Pakistan in 2025: 31 cases: [KabulNow, citing WHO](https://kabulnow.com/2026/06/who-reports-two-new-polio-cases-in-afghanistan-total-reaches-six/).
- Pakistan in 2021: one case, in Killa Abdullah: [CDC *MMWR* via PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC8486386).
- 47 countries and one territory certified malaria-free, as of Timor-Leste in July 2025: [WHO list](https://www.who.int/teams/global-malaria-programme/elimination/countries-and-territories-certified-malaria-free-by-who), [WHO Timor-Leste](https://www.who.int/timorleste/news/detail/24-07-2025-timor-leste-certified-malaria-free-by-who).
- Malaria in 2024: about 610,000 deaths, and $3.9 billion of funding against a $9.3 billion target: [WHO World Malaria Report 2025](https://www.who.int/teams/global-malaria-programme/reports/world-malaria-report-2025), [Gulf Times](https://www.gulf-times.com/article/716412/international/who-publishes-malaria-report-2025-showing-deaths-increase-in-2024).

Not posted or submitted. Waiting for the owner's approval.
