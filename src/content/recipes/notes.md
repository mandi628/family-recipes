---
title: "Notes"
tags: ["Help"]
created: "20250123174840279"
modified: "20250912221554803"
---

To generate a list:^^1^^

```
<$list filter="[tag[HelloThere]]"><$view field="title"/><br/></$list>
```
--------
To generate a list of links:^^1^^

```
<<list-links "[tag[HelloThere]]">>
```
To add additional filters, add more tags...

```
<<list-links "[tag[tag1]tag[tag2]]">>
```

You can also remove items from the list by adding a !

```
<<list-links "[tag[tag1]!tag[tag2]]">>
```

You can sort the list by title, or by other fields, like the creation date:

```
<<list-links "[tag[tag1]sort[created]]">>
```
```
<<list-links "tag[tag1]!sort[title]]">>
```

--------
References:  


# https://tiddlywiki.com/static/Introduction%2520to%2520Lists.html