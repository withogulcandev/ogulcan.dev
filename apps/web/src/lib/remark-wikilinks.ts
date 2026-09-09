import type { Root } from 'mdast';
import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';

const WIKILINK = /\[\[([^\]|]+)\]\]/g;

export const remarkWikilinks: Plugin<[], Root> = () => {
  return (tree) => {
    visit(tree, 'text', (node, index, parent) => {
      if (!parent || index === undefined) return;
      if (!node.value.includes('[[')) return;

      const parts: any[] = [];
      let last = 0;
      WIKILINK.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = WIKILINK.exec(node.value)) !== null) {
        if (m.index > last) {
          parts.push({ type: 'text', value: node.value.slice(last, m.index) });
        }
        const slug = m[1].trim();
        parts.push({
          type: 'link',
          url: `/${slug}`,
          data: {
            hProperties: {
              className: 'wikilink',
              'data-entry': slug,
            },
          },
          children: [{ type: 'text', value: slug }],
        });
        last = m.index + m[0].length;
      }
      if (last < node.value.length) {
        parts.push({ type: 'text', value: node.value.slice(last) });
      }

      parent.children.splice(index, 1, ...parts);
      return index + parts.length;
    });
  };
};
