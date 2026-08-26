const slugify = require('slugify');

/**
 * Generates an SEO optimized slug for a note.
 * e.g., 'svvv-btech-cse-sem-3-data-structures-unit-1-pdf'
 */
function createNoteSlug(title, course, semester) {
  const parts = ['svvv'];
  
  if (course) {
    parts.push(course.replace(/\./g, '')); // B.Tech -> BTech
  }
  if (semester) {
    parts.push(`sem-${semester}`);
  }
  if (title) {
    parts.push(title);
  }
  parts.push('pdf');

  const rawString = parts.join(' ');
  return slugify(rawString, {
    lower: true,
    strict: true,
    remove: /[*+~.()'"!:@/]/g
  });
}

module.exports = { createNoteSlug };
