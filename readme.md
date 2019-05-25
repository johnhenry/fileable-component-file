![fileable logo](./static/docs/logo.png)

# Fileable Component: File

[Fileable](https://github.com/isaacs/fileable) template component used to create files

```javascript
import {File} from 'fileable-component-file';
const template = ()=><File name='readme.md'>
# This is a sample file.
</File>
```

If a file may contains other files, content will be concatinated.

```javascript
const template = ()=><File name='readme.md'>
    # This is a sample file.
    <File>{'\n'}## This is more content</File>
    <File>{'\n'}## As is this{'\n'}</File>
    ## This is the end
</File>
```

### Attributs

### name

Name of the file.

```javascript
const template = ()=><File name="empty_file"/>;
```

If no name is passed, a hash (SHA_256) of the content will be used.

### extension

Extension appended to name.
Particularly useful when name is autogenerated.

```javascript
const template = ()=><File extension='.js'>
...javascript content
</File>;
```

### src

File content in src attribute will be appended to child content.

```javascript
const template = ()=><File src='https://www.google.com'>Google's Home Page:</File>;
```


### src_context

Relative sources are, by default, resolved relative to the template location.

```javascript
const template = ()=><File src='./sibbling-of-template'/>;
```

Setting src_content to 'File.SRC_CONTEXT_FOLDER' will resolve the file relative to the destination folder.

```javascript
const template = ()=><File src='./sibbling-of-template' src_context={File.SRC_CONTEXT_FOLDER}/>;
```

You may also set src_context to a string.

```javascript
const template = ()=><File src='./bashrc' src_context='~'/>;
```

Defaults to 'File.SRC_CONTEXT_TEMPLATE'

```javascript
const template = ()=><File src='./sibbling-of-template' src_context={File.SRC_CONTEXT_TEMPLATE}/>;
```

### cmd

Command will be run and content in src attribute will be appended to child content.

```javascript
const template = ()=><File cmd='date'>Content created at:</File>;
```

If cmd starts with '|', child content will be piped through command

```javascript
const template = ()=><File name='.cheesefile' cmd='|grep Cheese'>{
`Lines containing "Cheese:":
    - Feta Cheese
    - Broccoli
    - American Cheese
    - Ham
    - Bread
    - Cheesebread
`}</File>;
```

### mode

Set the mode of a file.

```javascript
const template = ()=><File name='helloworld' mode={0o777}>
#!/usr/bin/env node
console.log('hello world');
</File>;
```

### sgmldoctype

Add a doctype to the beginning of an SGML file.

```javascript
const template = ()=><File name='index.html' sgmldoctype='html'>
{`<html>
    <head></head>
    <body></body>
</html>`}
</File>;
```

### transform

Content will be transformed via given function

```javascript

const addBeginning = (content)=>
`// Begin$
${content}`;

const template = ()=><File transform={addBeginning}>
// Middle
</File>;
```

### raw

Content is not transformed into a buffer.

```javascript
const template = ()=><File name='main.js' transform={(obj)=>JSON.stringify(obj)} >
    <File raw>{{
        name: 'Amy',
        age: 25
    }}</File>
</File>;
```

### ps

When used within other files, the ps attribute adds content to files after any transfomations from (cmd, transform) are applied.

```javascript

const addEnd = (content)=>
`${content}
// ^End`;

const template = ()=><File transform={addBeginning}>
    // Middle
    <File ps/>
    // Post End
    </File>
</File>;
```

### content

...

```javascript
const template = ()=><File name='main.js' content='hello world'/>;
```

### clone

When used within other files, the clone command takes the content of the file up to that point and clones it to another file.

```javascript
const template = ()=><File name='main.js'>
    Content
    <File clone />
</File>;
```

If a placeholder string is passed as the clone attribute, it will appear in place of that file within the parent.

```javascript
const template = ()=><File name='main.js'>
    Content
    <File clone='// filed cloned at hash' />
</File>;
```

Combine other attributes to create "sidecar" files

```javascript
const template = ()=><File src='../src/index.js' name='index.js' cmd='|./minify-file'>
    <File clone='//src-map: index.map.js' ps name='index.map.js' cmd='|./produce-file-map'></File>
</File>;
```



### map

Chlldren will be transformed via given function.


```javascript
const incrementAge = (person)=> {person.age += 1; return person;};
const template = ()=><File name='main.js' map={incrementAge}>
    <File raw>{{
        name='Amy',
        age:25
    }}<File/>
    <File raw>{{
        name='Bob',
        age:30
    }}<File/>
    <File raw>{{
        name='Carl',
        age:35
    }}<File/>
</File>;
```

### react_renderer

By default, [React's HTML tags](https://react-cn.github.io/react/docs/tags-and-attributes.html) can be used to produce a file's content.

```javascript
const template = ()=> <File name="index.html">
    &lt;!doctype html&gt;
    <html>
        <body> Hello World
            <script src='index.js'></script>
        </body>
    </html>
</File>;
```

Adding the "react_renderer" allows you to customize how react componets are rendered.

```javascript
import repng from 'repng';
const template = ()=> <File name="index.png" react_renderer={(component, props) => repng(component, { props, width: 162, height: 100 })}>
    <html>
        <style>{
            `
            * {
                color: green;
            }`
        }</style>
        <body> Hello World
            <script src='index.js'></script>
        </body>
    </html>
</File>;
```

## Rendering new lines

The folowing template:

```javascript
const template = () => <File>
1
2
3
</File>
```

renders as:

```text
123
```

To add a new line in react, there are at least 3 options.

### Brackets and backtics

The folowing template:
```javascript
const template = () => <File>{
`1
2
3`
}</File>
```

renders as:

```text
1
2
3
```

### Newline character within brackets

The folowing template:
```javascript
const template = () => <File>
1{'\n'}
2{'\n'}
3
</File>
```

renders as:

```text
1
2
3
```

### Sub-Files with new-line characters

The folowing template:
```javascript
const template = () => <File>
1<File end />
2<File end />
3
</File>
```

renders as:

```text
1
2
3
```
## API

### Table of contents
## Todo

- remove unnecessary dependencies
- add proper typescript typeings
- add "ovewrite" attribute
