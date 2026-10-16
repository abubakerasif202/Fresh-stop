---
version: alpha
colors:
  primary: "#0B3D1B"
  action: "#E10606"
  green: "#2ECC1F"
  cream: "#FFF9EE"
  ink: "#183323"
typography:
  body:
    fontFamily: "Nunito, sans-serif"
  display:
    fontFamily: "Nunito, sans-serif"
rounded:
  card: "16px"
  button: "999px"
spacing:
  section: "64px"
  card: "24px"
components:
  catalogueCard:
    imageRatio: "1 / 1"
    action: "Enquire"
---
## Overview
Fresh Stop is a Sydney grocery catalogue for direct customer contact. The visual stance is colourful market editorial: oversized rounded green/red headings, an apple stop-sign mark, vivid produce, cream space and disciplined grids. DFII: impact 4 + fit 5 + feasibility 5 + performance 4 - consistency risk 3 = 15.
The supplied mockups inform hierarchy and colour only. No prices, ratings, discounts or claims from those mockups are published.

## Colors
Runtime ownership is src/app/globals.css @theme. Deep forest anchors type and major panels. Fresh red owns primary enquiry actions. Leaf green is decorative; it is never small white text's background. Cream supports realistic food photographs.

## Typography
Nunito from next/font/google owns body and display, with strong weight contrast. Australian English. Headings use tight tracking and line height; body copy stays comfortable.

## Layout
1280px maximum page width; 16px mobile gutters and 32px desktop. Two-column mobile catalogue, three tablet, four/five wide cards. Category navigation wraps. Hero uses asymmetric type and a curved image frame. No purchase state exists.

## Elevation & Depth
Light shadows on white product cards, thin green borders. No glass panels. Images supply depth.

## Shapes
Rounded 16–24px cards, restrained pill actions. A single oversized arch frames the hero; all other composition remains rectangular.

## Components
ProductCard owns read-only item presentation; ContactActions owns wholesale/delivery actions; contact.ts owns all contact URLs; catalogue-data.ts owns public data projection.
Catalogue pages are URL-backed server search/filter views. Admin retains existing protected management. Source photographs without publication rights remain internal.
Motion uses CSS transforms and opacity plus the existing Reveal component; prefers-reduced-motion disables all movement.

## Do's and Don'ts
Use verified data and neutral item descriptions. Label AI imagery illustrative. Display Enquire for details.
Never expose prices, branch stock, checkout, testimonials, delivery promises or unapproved shop photographs. Staged catalogue entries exist only in explicitly configured reviewed snapshot Preview mode; live imports require approval.
