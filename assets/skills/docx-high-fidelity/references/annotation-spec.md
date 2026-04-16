# Annotation Spec (Markdown++)

Allowed block tags:

1. `<!-- style:paragraph:STYLE_ID --> ... <!-- /style:paragraph -->`
2. `<!-- style:table:STYLE_ID --> ... <!-- /style:table -->`
3. `<!-- style:list:STYLE_ID;numId=N;ilvl=L --> ... <!-- /style:list -->`
4. `<!-- style:image:Image --> ![alt](media://MEDIA_KEY) <!-- /style:image -->`

Allowed inline tag:

1. `<!-- style:character:STYLE_ID --> ... <!-- /style:character -->`

Hard constraints:

1. No HTML tags.
2. No nested `style:character` blocks.
3. All tags must be paired.
4. `STYLE_ID` must be in manifest style whitelist.
