# eXBBCode parser
Your extendable, fast and reliable BB-Code parser and renderer for JavaScript.  

## Attention
~~Do not use the HTML output without verify it!  
Its highly recommended to send it throw DOMPurify!~~
Since we're using React instead of building a HTML string we've no need for this anymore!

## Test code
```bbcode
[b]Hello <> \\\\[font=arial]:_D[/font] [url=https://google.de]World[/] [hr] [color=FF00FFFF]Second line [/b]
 s dsdsdsdsdsds sddddd asdasdasd :D Hello World



[color=red]this should be red[/color]
[color=FFFF00]this should be yellow[/color]
[color=0000FF99]this should be blue with transparency[/color]

[url][color=red]teaspeak.de[/url]

[no-parse][b] this is a bbcode [/b][/no-parse]
[b]this is actiually bold[/b]

[c] This text is centered [/c]
[r] This text is right aligned     [/r]
[bgcolor=red][c] Left text [l] This test is left aligned [/l][/c][/bgcolor]

[size=9]Big Text[/size]
[size=2rem]Double size text[/size]
[font="Arial Black", Gadget, sans-serif]Its bold[/font]

[code]
//BBCodes will be escaped as well: [br]
function test() {
    console.log("Hello World");
}
[/code] :D

Some inline [icode]code[/icode] is this

[i]Italic[/i]
[u]Underlined[/u]
[s]Strike though[/s]

[noparse]
Added a no parse here to avoid image loading
[url]https://google.com[/url]
[url=https://google.com]click me[/url]

[img]https://teaspeak.de/img/teaspeak_cup_animated.png[/img]
[img=https://teaspeak.de/img/teaspeak_cup_animated.png]A hover test[/img]
[url=https://google.com][img=https://teaspeak.de/img/teaspeak_cup_animated.png]click me![/img][/url]
[/noparse]

[sub]Hello World[/sub]Hello World[sup]Hello [sup]Hello [sup]Hello World[/sup] World[/sup] World[/sup]
[hr] :D[br]XXXXX

[ulist][*] Element A
[*] Element B
[*] Element C
[/ulist][olist][*] Element A
[*] Element B
[*] Element C
[/olist]

<hr>
<script>alert(1);</script>

[noparse][yt]https://www.youtube.com/watch?v=TLci6ErUugM[/yt]
```

