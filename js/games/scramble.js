/* Word Scramble — Language. Unscramble words that grow longer with each level.
   Lists avoid words with common anagrams so there's one clear answer. */
(function () {
  const J = window.JOA;

  const WORDS = {
    4: 'bake bird boat book cake corn desk duck farm fish frog fork gift gold hand home hope jump kite king milk park road rock swim tree word yarn zero bell drum ball baby hawk quiz jazz wind sock cozy glow bike boot sand foot bath cook girl harp hill kiwi lock mask moth pond soup taxi tent toad worm cube dish jeep oven pink sofa'.split(' '),
    5: 'apple beach brick cloud candy chair chalk clock crown dance eagle flame ghost happy honey jelly juice knife magic mango music paint piano pilot plant queen river robot storm sugar tiger toast train whale zebra world pizza puppy sheep thumb light mouse house bench berry camel cliff daisy dress drink fairy flute goose grass igloo koala llama match moose otter panda robin salad scarf shark shirt spoon stamp tooth towel truck tulip wagon watch'.split(' '),
    6: 'animal banana basket bridge button candle carrot castle cheese circle cookie dragon father flower guitar hammer island jungle kitten ladder little mirror monkey number orange pencil people pickle planet pocket puzzle rabbit rocket school summer sunset teapot tomato turtle violin window winter yellow bottle butter cactus'.split(' '),
    7: 'balloon blanket cabbage captain chicken compass cupcake diamond dolphin freedom giraffe harmony holiday kitchen lantern library monster morning mystery octopus pancake penguin picture popcorn pumpkin rainbow science thunder tornado unicorn vampire volcano weather welcome journey curtain fortune history gallery'.split(' '),
    8: 'airplane alphabet backpack baseball birthday building calendar campfire children dinosaur elephant envelope exercise festival football hospital keyboard kangaroo language mountain notebook painting question sandwich squirrel sunshine treasure umbrella vacation magician marathon hedgehog lemonade broccoli dumpling'.split(' '),
    10: 'strawberry basketball friendship restaurant helicopter watermelon skateboard motorcycle playground lighthouse toothbrush everything incredible experience microphone television dictionary photograph adventurer fingernail'.split(' '),
    9: 'adventure chocolate pineapple butterfly crocodile detective fireworks hamburger invention telescope wonderful waterfall astronaut celebrate beautiful knowledge scientist'.split(' '),
  };
  const ALL = new Set(Object.values(WORDS).flat());

  // Picture clues for beginner helpers (Levels 1–2 use 4- and 5-letter words).
  const CLUES = {
    bake: '🧁 cook it in an oven', bird: '🐦', boat: '⛵', book: '📖', cake: '🎂', corn: '🌽', desk: '✏️ a table for schoolwork',
    duck: '🦆', farm: '🚜 where cows and crops live', fish: '🐟', frog: '🐸', fork: '🍴', gift: '🎁', gold: '🥇 a shiny yellow metal',
    hand: '✋', home: '🏡 where you live', hope: '🙏 wishing for something good', jump: '🦘 leap up high', kite: '🪁', king: '🤴',
    milk: '🥛', park: '🛝 a place with swings', road: '🛣️', rock: '🪨', swim: '🏊', tree: '🌳', word: '🔤 letters that go together',
    yarn: '🧶', zero: '0️⃣', bell: '🔔', drum: '🥁', ball: '⚽', baby: '👶', hawk: '🦅 a hunting bird', quiz: '❓ a short test',
    jazz: '🎷 a kind of music', wind: '🌬️', sock: '🧦', cozy: '🛋️ warm and comfy', glow: '✨ shine softly',
    apple: '🍎', beach: '🏖️', brick: '🧱', cloud: '☁️', candy: '🍬', chair: '🪑', chalk: '🖍️ write on a blackboard', clock: '🕰️',
    crown: '👑', dance: '💃', eagle: '🦅 a big bird on flags', flame: '🔥', ghost: '👻', happy: '😀', honey: '🍯', jelly: '🍇 spread it on toast',
    juice: '🧃', knife: '🔪', magic: '🪄', mango: '🥭', music: '🎵', paint: '🎨', piano: '🎹', pilot: '✈️ flies the plane', plant: '🪴',
    queen: '👸', river: '🏞️', robot: '🤖', storm: '⛈️', sugar: '🍭 makes food sweet', tiger: '🐯', toast: '🍞 bread from the toaster',
    train: '🚂', whale: '🐋', zebra: '🦓', world: '🌍', pizza: '🍕', puppy: '🐶', sheep: '🐑', thumb: '👍', light: '💡', mouse: '🐭',
    house: '🏠',
    bike: '🚲', boot: '🥾', sand: '🏖️ tiny grains on the beach', foot: '🦶', bath: '🛁', cook: '👩‍🍳', girl: '👧',
    harp: '🎶 a big instrument with many strings', hill: '⛰️ a small mountain', kiwi: '🥝', lock: '🔒', mask: '🎭',
    moth: '🦋 like a butterfly, flies at night', pond: '🦆 a small lake where ducks swim', soup: '🍲', taxi: '🚕', tent: '⛺',
    toad: '🐸 like a frog, with bumpy skin', worm: '🪱', cube: '🧊 a box shape with 6 square sides', dish: '🍽️', jeep: '🚙',
    oven: '🍕 a hot box you bake in', pink: '🌸 a light red color', sofa: '🛋️ a long soft seat',
    bench: '🪑 a long seat in the park', berry: '🫐', camel: '🐫', cliff: '🧗 a steep rocky edge', daisy: '🌼', dress: '👗',
    drink: '🥤', fairy: '🧚', flute: '🎶 a musical pipe you blow across', goose: '🪿', grass: '🌱', igloo: '🧊 a house made of snow',
    koala: '🐨', llama: '🦙', match: '🔥 a tiny stick that lights a fire', moose: '🫎', otter: '🦦', panda: '🐼',
    robin: '🐦 a bird with a red chest', salad: '🥗', scarf: '🧣', shark: '🦈', shirt: '👕', spoon: '🥄',
    stamp: '✉️ you stick it on a letter', tooth: '🦷', towel: '🛁 dry off with it after a bath', truck: '🚚', tulip: '🌷',
    wagon: '🛒 you pull it along on wheels', watch: '⌚',
  };
  const LENGTHS = [[4], [4, 5], [5], [5, 6], [6], [6, 7], [7], [7, 8], [8], [8, 9], [9], [9, 10]]; // 11 Master, 12 Grandmaster
  const sorted = (w) => w.split('').sort().join('');

  // Pick words that are new to this round and to this player. When every word of
  // a length has been seen, that length starts over (oldest first) — never
  // repeating a word inside one round.
  function pickWords(rng, lens, count, hist) {
    const round = new Set();
    const out = [];
    for (let k = 0; k < count; k++) {
      const len = lens[k % lens.length];
      let fresh = WORDS[len].filter((w) => !round.has(w) && !(hist && hist.has(w)));
      if (!fresh.length && hist) {
        hist.forget((w) => w.length === len && !round.has(w));
        fresh = WORDS[len].filter((w) => !round.has(w));
      }
      const w = rng.pick(fresh);
      round.add(w);
      if (hist) hist.add(w);
      out.push(w);
    }
    return out;
  }

  function scramble(rng, w) {
    let s = w;
    for (let t = 0; t < 20 && s === w; t++) s = rng.shuffle(w.split('')).join('');
    return s;
  }

  J.register({
    id: 'scramble',
    name: 'Word Scramble',
    icon: '🔤',
    skill: 'Language',
    color: '#c0562b',
    tagline: 'Unjumble the letters to reveal the hidden word.',
    why: 'Rearranging letters strengthens vocabulary, spelling and verbal fluency.',
    howTo: 'Tap the letter tiles (or type) to spell the hidden word, then press <b>Check</b>. Stuck? <b>Hint</b> reveals the next letter (costs a little), <b>Shuffle</b> mixes the tiles, or <b>Skip</b> to move on. 8 words per round.',
    helpers: [
      'A <b>picture clue</b> shows what the word means.',
      'The <b>first letter</b> is filled in for you.',
      '<b>Hints</b> are free.',
    ],
    mount(root, ctx) {
      const { rng, level, finish } = ctx;
      let helpers = ctx.helpers;
      const COUNT = 8;
      const lens = LENGTHS[level - 1];
      const hist = J.seenHistory('scramble');
      const words = pickWords(rng, lens, COUNT, hist);
      hist.save();
      let i = 0, points = 0, solved = 0;
      const watch = J.stopwatch(null);

      function show() {
        const word = words[i];
        let letters = scramble(rng, word).split('');
        let hints = 0;
        let usedTiles = [];
        root.innerHTML = `
          <div class="g-bar"><span>Word ${i + 1} of ${COUNT}</span><span class="muted">✅ ${solved}</span></div>
          <div class="g-progress"><i style="width:${(i / COUNT) * 100}%"></i></div>
          <div class="g-center">
            <p class="muted">${word.length} letters</p>
            ${CLUES[word] ? `<div class="helper-tip sc-clue" style="font-size:1.1rem">Clue: ${CLUES[word]}</div>` : ''}
            <div class="tiles"></div>
            <form class="ans-form" autocomplete="off">
              <input class="g-input" aria-label="Your word" autocapitalize="off" spellcheck="false" maxlength="${word.length}" />
              <div class="btn-row" style="justify-content:center">
                <button class="btn" type="submit">Check</button>
                <button class="btn ghost small" type="button" data-a="back" aria-label="Delete last letter">⌫</button>
                <button class="btn ghost small" type="button" data-a="clear">Clear</button>
                <button class="btn ghost small" type="button" data-a="shuffle">🔀 Shuffle</button>
                <button class="btn ghost small" type="button" data-a="hint">💡 Hint</button>
                <button class="btn link" type="button" data-a="skip">Skip</button>
              </div>
            </form>
            <div class="g-msg"></div>
          </div>`;
        const tilesEl = root.querySelector('.tiles');
        const input = root.querySelector('.g-input');
        const msg = root.querySelector('.g-msg');

        function syncTiles() {
          // mark tiles as used based on the typed letters
          const typed = input.value.toLowerCase().split('');
          usedTiles = [];
          const avail = letters.map((l, k) => ({ l, k }));
          for (const ch of typed) {
            const f = avail.find((a) => a.l === ch && !usedTiles.includes(a.k));
            if (f) usedTiles.push(f.k);
          }
          tilesEl.innerHTML = letters.map((l, k) => `<button type="button" class="tile ${usedTiles.includes(k) ? 'used' : ''}" data-k="${k}">${l}</button>`).join('');
        }

        function done(ok, text) {
          msg.className = 'g-msg ' + (ok ? 'good' : 'bad');
          msg.textContent = text;
          root.querySelectorAll('button, input').forEach((el) => (el.disabled = true));
          setTimeout(() => {
            i++;
            if (i < COUNT) show();
            else {
              watch.stop();
              finish((points / COUNT) * 100, `${solved} of ${COUNT} words in ${J.fmtTime(watch.seconds())}.`);
            }
          }, ok ? 900 : 1600);
        }

        tilesEl.addEventListener('click', (e) => {
          const t = e.target.closest('.tile');
          if (!t || t.classList.contains('used')) return;
          input.value += letters[+t.dataset.k];
          syncTiles();
          J.autoFocus(input);
        });
        input.addEventListener('input', syncTiles);
        root.querySelector('.ans-form').addEventListener('submit', (e) => {
          e.preventDefault();
          const guess = input.value.trim().toLowerCase();
          if (guess.length !== word.length) {
            msg.className = 'g-msg bad';
            msg.textContent = `Use all ${word.length} letters.`;
            return;
          }
          if (guess === word || (sorted(guess) === sorted(word) && ALL.has(guess))) {
            solved++;
            points += Math.max(0.4, 1 - hints * 0.2);
            done(true, `Yes — ${word.toUpperCase()}! 🎉`);
          } else {
            msg.className = 'g-msg bad';
            msg.textContent = 'Not a match — try again.';
          }
        });
        root.querySelector('.btn-row').addEventListener('click', (e) => {
          const a = e.target.dataset.a;
          if (a === 'back') input.value = input.value.slice(0, -1);
          if (a === 'clear') input.value = '';
          if (a === 'shuffle') letters = rng.shuffle(letters);
          if (a === 'hint') {
            // keep the correct prefix, add one more correct letter
            let p = 0;
            const v = input.value.toLowerCase();
            while (p < v.length && v[p] === word[p]) p++;
            if (p < word.length) {
              if (!helpers) hints++;
              input.value = word.slice(0, p + 1);
            }
          }
          if (a === 'skip') return done(false, `The word was ${word.toUpperCase()}.`);
          syncTiles();
          J.autoFocus(input);
        });
        if (helpers) input.value = word[0]; // start with the first letter
        syncTiles();
        syncHelpers();
        J.autoFocus(input);
      }

      function syncHelpers() {
        const clue = root.querySelector('.sc-clue');
        if (clue) clue.hidden = !helpers;
      }

      show();
      return {
        cleanup: () => watch.stop(),
        setHelpers(on) {
          helpers = on;
          syncHelpers();
        },
      };
    },
  });

  J._scramble = { WORDS, CLUES, pickWords };
})();
