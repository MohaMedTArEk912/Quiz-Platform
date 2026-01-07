#!/bin/bash
# OAuth Testing Script for Quiz Platform

echo "🧪 OAuth Configuration Test Suite"
echo "=================================="
echo ""

# Test 1: Check if .env has required variables
echo "✅ Test 1: Environment Variables"
if grep -q "VITE_GOOGLE_CLIENT_ID" .env; then
    echo "  ✓ VITE_GOOGLE_CLIENT_ID found in .env"
else
    echo "  ✗ VITE_GOOGLE_CLIENT_ID missing in .env"
    exit 1
fi

if grep -q "JWT_SECRET" .env; then
    echo "  ✓ JWT_SECRET found in .env"
else
    echo "  ✗ JWT_SECRET missing in .env"
    exit 1
fi

if grep -q "MONGODB_URI" .env; then
    echo "  ✓ MONGODB_URI found in .env"
else
    echo "  ✗ MONGODB_URI missing in .env"
    exit 1
fi

echo ""
echo "✅ Test 2: File Structure"
files=(
    "public/auth/google/callback.html"
    "src/pages/LoginPage.tsx"
    "src/context/AuthContext.tsx"
    "src/lib/api.ts"
    "server/routes/auth.js"
    "server/controllers/authController.js"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✓ $file exists"
    else
        echo "  ✗ $file missing"
        exit 1
    fi
done

echo ""
echo "✅ Test 3: Code Validation"

# Check if callback.html has postMessage
if grep -q "postMessage" public/auth/google/callback.html; then
    echo "  ✓ Callback handler has postMessage"
else
    echo "  ✗ Callback handler missing postMessage"
    exit 1
fi

# Check if API endpoint exists
if grep -q "googleAuth" server/controllers/authController.js; then
    echo "  ✓ googleAuth controller method exists"
else
    echo "  ✗ googleAuth controller method missing"
    exit 1
fi

# Check if route is registered
if grep -q "auth/google" server/routes/auth.js; then
    echo "  ✓ /api/auth/google route registered"
else
    echo "  ✗ /api/auth/google route missing"
    exit 1
fi

echo ""
echo "✅ All Tests Passed!"
echo ""
echo "📝 Next Steps:"
echo "1. Run: npm run dev"
echo "2. Go to: http://localhost:5173/login"
echo "3. Click 'Sign in with Google'"
echo "4. Check browser console for any errors"
echo ""
echo "🔗 Complete guide: docs/OAUTH_VERIFICATION_GUIDE.md"
