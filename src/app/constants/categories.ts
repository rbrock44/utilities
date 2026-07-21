export const CATEGORIES: Category[] = [
    // {
    //   name: 'Productivity',
    //   tiles: [
    //     {
    //       title: 'Calculator',
    //       description: 'Basic calculator utility',
    //       icon: '🧮',
    //       param: ''
    //     },
    //     {
    //       title: 'Timer',
    //       description: 'Countdown and stopwatch',
    //       icon: '⏱️',
    //       param: ''
    //     },
    //     {
    //       title: 'Notes',
    //       description: 'Quick note taking',
    //       icon: '📝',
    //       param: ''
    //     }
    //   ]
    // },
    // {
    //   name: 'Converters',
    //   tiles: [
    //     {
    //       title: 'Unit Converter',
    //       description: 'Convert between units',
    //       icon: '📏',
    //       param: ''
    //     },
    //     {
    //       title: 'Currency',
    //       description: 'Exchange rates',
    //       icon: '💱',
    //       param: ''
    //     }
    //   ]
    // },
    {
        name: 'Utilities',
        tiles: [
            {
                title: 'Image to PDF',
                description: 'Convert image(s) into  PDF',
                icon: '📄',
                param: 'image-to-pdf'
            },
            {
                title: 'PDF Combiner',
                description: 'Merge multiple PDFs into one',
                icon: '📑',
                param: 'pdf-combiner'
            }
        ]
    },
    {
        name: 'Calculators',
        tiles: [
            {
                title: 'Precious Metals',
                description: 'Convert weight and type to spot price',
                icon: '⚖',
                param: 'precious-metals'
            },
            {
                title: 'Right Angle Calculator',
                description: 'Calculate missing triangle side length',
                icon: '📐',
                param: 'right-angle-calculator'
            },
            {
                title: 'Divider Spacing Calculator',
                description: 'Equal spacing for divider material along a total width',
                icon: '📏',
                param: 'divider-spacing-calculator'
            }
        ]
    },
    {
        name: 'Information',
        tiles: [
            {
                title: 'Gold in Coins',
                description: 'Show gold content and spot price of coins',
                icon: '🥇',
                param: 'gold-in-coins'
            },
            {
                title: 'Silver in Coins',
                description: 'Show silver content and spot price of coins',
                icon: '🥈',
                param: 'silver-in-coins'
            },
        ]
    }
];