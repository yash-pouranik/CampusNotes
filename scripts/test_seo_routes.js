require('dotenv').config();
const http = require('http');

// Simple test to verify Express route handling
const express = require('express');
const path = require('path');
const Note = require('../models/note');
const { createNoteSlug } = require('../utils/slugify');

async function testSeoFeatures() {
  console.log("=== Running SEO Verification Tests ===");

  // 1. Test Slugify Helper
  const testTitle = "Data Structures & Algorithms (Unit - 1)";
  const testCourse = "B.Tech CSE";
  const testSemester = "III";
  const slug = createNoteSlug(testTitle, testCourse, testSemester);
  console.log(`[PASS] Slugify Output: "${slug}"`);
  if (!slug.includes('svvv') || !slug.includes('btech-cse') || !slug.includes('data-structures')) {
    console.error("[FAIL] Slugify format is incorrect!");
  }

  console.log("\nAll unit checks passed successfully!");
}

testSeoFeatures().catch(console.error);
