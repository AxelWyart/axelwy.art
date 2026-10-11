# Self-hosted fonts

These WOFF2 files preserve the site's existing Inter 4.1 and Google Fonts Inter Tight v9 typography. Their SIL Open Font licenses are included alongside the fonts.

- Inter: regular (400) and semibold (600), from `https://rsms.me/inter/font-files/Inter-{Regular,SemiBold}.woff2?v=4.1`.
- Inter Tight: a variable font restricted to weights 400–600, from `https://fonts.gstatic.com/s/intertight/v9/NGSwv5HMAFg6IuGlBNMjxLsH8ahuQ2e8.woff2`.

The three fonts used on the first screen are preloaded. Only the regular and semibold weights used by the visible page are included. All faces use `font-display: swap` so text remains visible during loading.

Inter was subset with FontTools 4.66.1 to Latin and Latin Extended-A, combining marks, general punctuation, the euro and trademark symbols, common arrows, minus/slash symbols, and the replacement character. Inter Tight retains its existing Google Fonts Latin character set and uses FontTools' variable-font instancer to restrict the weight axis. Standard shaping, kerning, and ligature features are retained.

For new copy in other scripts, add the relevant glyphs to these subsets or supply additional font faces. Do not replace these files with a different font release without checking text wrapping and the hero cursor alignment.
