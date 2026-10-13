#!/usr/bin/env python3
"""
Re-cut the self-hosted faces (C6, R3-18 round 2). See public/fonts/README.md.

    python3 -m pip install fonttools brotli
    python3 scripts/fonts-recut.py <source dir> <output dir>

Each file keeps exactly the codepoints of its source and every layout feature
except the fractions (frac, numr, dnom: no CSS asks for them); glyph names go
(post format 3); Inter's weight axis is limited to 400..900 (no CSS asks below
400; `bolder` can reach 900). A cut file must render the same pixels as its
source at every weight in use, in Latin, Yoruba, Igbo and Hausa.
"""
import os, sys
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools import subset
F=os.path.join(sys.argv[1], '')
OUT=os.path.join(sys.argv[2], '')
for f in sorted(os.listdir(F)):
    if not f.endswith('.woff2'): continue
    font=TTFont(F+f)
    cps=sorted(font.getBestCmap())
    feats=set()
    for t in ('GSUB','GPOS'):
        if t in font:
            for fr in font[t].table.FeatureList.FeatureRecord: feats.add(fr.FeatureTag)
    feats-= {'frac','numr','dnom'}
    if 'fvar' in font:
        inst=instancer.instantiateVariableFont(font, {'wght':(400,900)})
        tmp=os.path.join(OUT, '.tmp.ttf'); inst.save(tmp); font=TTFont(tmp, lazy=False); os.remove(tmp)
    opts=subset.Options(); opts.flavor='woff2'; opts.glyph_names=False; opts.layout_features=sorted(feats) or ['*']
    opts.name_IDs=['*']; opts.name_languages=['*']; opts.recalc_bounds=False
    sub=subset.Subsetter(opts); sub.populate(unicodes=cps); sub.subset(font)
    subset.save_font(font, OUT+f, opts)
    new=TTFont(OUT+f)
    assert set(new.getBestCmap())==set(cps), f
    print(f, os.path.getsize(F+f), '->', os.path.getsize(OUT+f), 'features', sorted(feats), 'axes', [(a.axisTag,a.minValue,a.defaultValue,a.maxValue) for a in new['fvar'].axes] if 'fvar' in new else None)
