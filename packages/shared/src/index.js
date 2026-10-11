export const templates = {
    business: { subject: "Project Information – Selected Document Content", message: "Hello,\n\nPlease find the selected information from the document(s) attached. The included content has been specifically selected for your review.\n\nI hope this provides the relevant details you need. Please let me know if you would like any additional information or clarification.\n\nRegards,\n[Your Name]" },
    personal: { subject: "Sharing Some Information With You", message: "Hello,\n\nI’m sharing some selected information from my documents that I thought would be useful for you.\n\nI’ve included only the relevant sections to keep everything concise and easy to review. Please have a look when you get a chance, and feel free to let me know if you have any questions.\n\nBest,\n[Your Name]" }
};
export const wordCount = (s) => s.trim() ? s.trim().split(/\s+/).length : 0;
