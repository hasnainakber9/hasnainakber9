/* The work shown on the page. To add a piece: put its preview in media/shorts/<id>.mp4 (silent loop) and
   media/shorts/<id>.jpg (poster), then add an entry below. `yt` is the YouTube video id. */
window.WORKS = {
  episodesPublished: 71,

  films: [
    {
      title: 'The Future Is Buildable',
      yt: 'KBVE8f7A6Xk',
      length: '1:55',
      poster: 'media/films/the-future-is-buildable.jpg',
      alt: 'A toy figure in a yellow jacket presses a teal block into a white baseplate, with a mountain village behind.',
      logline: 'The future is not something we wait for. It is something we build. A toy-scale mountain valley, assembled piece by piece, asks one question: what are we building?',
      meta: ['2026', 'Generative video', 'Short film']
    },
    {
      title: 'MOTION DETECTED: 2100',
      yt: 'PeM1hyBoIdk',
      length: '1:40',
      poster: 'media/films/motion-detected-2100.jpg',
      alt: 'Underwater camera-trap frame of a hellbender salamander on a clear stream bed, stamped STN-04, 2100-06-15, with the caption "the river can see again."',
      logline: 'Same cameras. Same angles. 74 years apart. Seven camera-trap views of real places, imagined in 2026 and again in 2100. No flying cars and no miracle: just the slow work of putting nature back, recorded by the same cameras.',
      meta: ['2026', 'Generative video', 'Short film']
    },
    {
      title: 'Nobody’s Job',
      yt: 'Z0g9HjkkowA',
      length: '1:50',
      poster: 'media/films/nobodys-job.jpg',
      alt: 'A dead rocket stage and a satellite above the Earth, under the line "Only 11,000 work now."',
      logline: 'Every number in this film is real. About 40,000 objects are tracked in Earth orbit and only 11,000 still work. The villain is a nine-tonne dead rocket stage. The twist is physics: you don’t have to bring it down. You have to make it late.',
      meta: ['2026', 'Generative video', 'Short film']
    }
  ],

  /* Shorts grid: the hand-drawn ink pieces first, then the computed ones. */
  shorts: [
    { id: 'ep112', yt: 'P3OBNp23Cyg', title: 'Are you the same person you were 10 years ago?', tag: 'Ink illustration' },
    { id: 'ep109', yt: 'j1dXFdJDv1Y', title: 'How much of the world\u2019s work is never paid?', tag: 'Ink illustration' },
    { id: 'ep106', yt: 'sbdz-Xtngws', title: 'Is it better to be kind or selfish?', tag: 'Ink illustration' },
    { id: 'ep105', yt: 'wOyCDPzGqG8', title: 'How long until women and men are equal?', tag: 'Ink illustration' },
    { id: 'ep099', yt: 'kGcKVZsKlDM', title: 'Why is Java faster than Python?', tag: 'Code trace' },
    { id: 'ep085', yt: 'jZUZNoyKCws', title: 'The film that inspired Batman, on a $3 screen', tag: '8,192 pixels, 1 bit each' },
    { id: 'ep056', yt: 'Q35kaXhj20Q', title: 'I gave 500 birds 3 rules. Will they flock?', tag: 'Flocking simulation' },
    { id: 'ep095', yt: 'R81dLJaRU5Q', title: 'The host opens a goat door. Should you switch?', tag: '100,000 simulated games' }
  ],

  /* Long-form Zingkha explainers (16:9). */
  long: [
    { yt: 'fYe4QbU7ouw', title: 'Why does the air breathe? The CO\u2082 line, explained', length: '3 min', poster: 'media/long/ep113.jpg', tag: 'Ink explainer \u00b7 Mauna Loa, 1958 to today' },
    { yt: 'uizPzrWWXLM', title: 'The work nobody pays for', length: '4 min', poster: 'media/long/ep110.jpg', tag: 'Ink explainer \u00b7 Unpaid care work, counted' },
    { yt: 'PBIYT8P_oss', title: 'Why does kindness win? (And when it loses)', length: '4 min', poster: 'media/long/ep107.jpg', tag: 'Ink explainer \u00b7 Two farmers, one stream' },
    { yt: 'TcoXplBwgQE', title: 'What actually happens when you press Run?', length: '3 min', poster: 'media/long/ep104.jpg', tag: 'Zingkha Explains \u00b7 Seven layers between the click and the output' },
    { yt: 'NVlw_svmU0g', title: 'Why are languages dying?', length: '3 min', poster: 'media/long/ep102.jpg', tag: 'Zingkha Explains \u00b7 6,702 living languages, placed where they are spoken' }
  ],

  /* Hero film strip: ids of previews, in order. */
  strip: ['ep105', 'ep112', 'ep099', 'ep106', 'ep056', 'ep085', 'ep109', 'ep095']
};
