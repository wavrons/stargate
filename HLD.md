1. The Vault (Details Page)
Purpose: The "Truth" layer. This is the structured backbone of the trip.
• Key Features:
• The "Flex-Date" Toggle: Switch between "Fixed Dates" (Calendar picker) and "Duration Mode" (e.g., "7 Nights").
• Logic Blocks: Specific fields for Flight #, Confirmation #, and Hotel Address.
• Attachment Repository: A simple list of PDFs/Receipts (Museum tickets, etc.).
• Connections:
• Feeds: The date range/duration to the Itinerary View.
• Pulls: Booking addresses to populate the map in the Itinerary View.
• Don't Do (Anti-Features):
• Do not make it a full expense tracker. Don't add tax calculators or currency converters yet; keep it to "What am I doing and when?"
2. The Sandbox (The Board)
Purpose: The "Chaos" layer. A place for visual and textual inspiration before it’s scheduled.
• Key Features:
• Masonry Grid: A Pinterest-style layout for images, links, and text notes.
• Link Scraper: When you paste a link (e.g., a TripAdvisor page), it automatically pulls the thumbnail and title.
• "Bucket" Logic: Items here are "Unscheduled."
• Connections:
• Feeds: Every item here is a "Draggable" component for the Itinerary View.
• Don't Do (Anti-Features):
• Do not add a "Social Feed." This should be a private scrapbooking space. Don't worry about "Likes" or "Comments."
3. The Weaver (Itinerary View)
Purpose: The "Bridge." Where the Sandbox meets the Vault.
• Key Features:
• Dual-Pane UI: The Board items on the left, the Timeline on the right.
• Smart Timeline: If the trip is "Flexible," Days are labeled "Day 1, Day 2" instead of dates.
• "Publish" Toggle: A button that generates a unique, obscured URL (e.g., stargate.app/v/3f8j2-x91).
• Connections:
• Pulls: Data from both the Vault and the Board.
• Don't Do (Anti-Features):
• Do not build your own map routing. Just provide a button that says "Open in Google Maps."
4. The Portal (Public View)
Purpose: The "Read-Only" Output. This is what you send to friends.
• Key Features:
• No Auth: Access via a unique hash in the URL.
• Mobile-First Design: Optimized for a traveler walking down a street in Tokyo looking for their next stop.
• "Save as PDF": A simple way for the viewer to keep a copy.
• Don't Do (Anti-Features):
• Do not allow editing here. Any changes must happen in the logged-in app.

data flow logic:
\bm{\text{Sandbox (Chaos)} + \text{Vault (Constraints)} \xrightarrow{\text{Drag \& Drop}} \text{Itinerary (Order)}}

openapis
- open streetmap
- leaflet
- microlink.io
- open weather map
- amadeus (Testtier)
