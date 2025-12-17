#!/bin/bash

# Test script for doctor authentication endpoints
# Make sure the server is running before executing this script

BASE_URL="http://localhost:3001"
TEST_EMAIL="testdoctor$(date +%s)@example.com"
TEST_PASSWORD="securePassword123"

echo "========================================="
echo "Testing Doctor Authentication Endpoints"
echo "========================================="
echo ""

# Test 1: Register a new doctor
echo "Test 1: Register a new doctor"
echo "POST $BASE_URL/api/auth/doctor/register"
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/doctor/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}" \
  -w "\nHTTP_STATUS:%{http_code}")

HTTP_STATUS=$(echo "$REGISTER_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$REGISTER_RESPONSE" | sed '/HTTP_STATUS/d')

echo "Status: $HTTP_STATUS"
echo "Response: $RESPONSE_BODY"
echo ""

if [ "$HTTP_STATUS" != "201" ]; then
  echo "❌ Registration failed!"
  exit 1
fi
echo "✅ Registration successful!"
echo ""

# Test 2: Login with correct credentials
echo "Test 2: Login with correct credentials"
echo "POST $BASE_URL/api/auth/doctor/login"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/doctor/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}" \
  -w "\nHTTP_STATUS:%{http_code}")

HTTP_STATUS=$(echo "$LOGIN_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$LOGIN_RESPONSE" | sed '/HTTP_STATUS/d')

echo "Status: $HTTP_STATUS"
echo "Response: $RESPONSE_BODY"
echo ""

if [ "$HTTP_STATUS" != "200" ]; then
  echo "❌ Login failed!"
  exit 1
fi

# Extract JWT token
TOKEN=$(echo "$RESPONSE_BODY" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
if [ -z "$TOKEN" ]; then
  echo "❌ No token received!"
  exit 1
fi
echo "✅ Login successful! Token received."
echo ""

# Test 3: Validate JWT token
echo "Test 3: Validate JWT token"
echo "GET $BASE_URL/api/auth/doctor/validate"
VALIDATE_RESPONSE=$(curl -s -X GET "$BASE_URL/api/auth/doctor/validate" \
  -H "Authorization: Bearer $TOKEN" \
  -w "\nHTTP_STATUS:%{http_code}")

HTTP_STATUS=$(echo "$VALIDATE_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$VALIDATE_RESPONSE" | sed '/HTTP_STATUS/d')

echo "Status: $HTTP_STATUS"
echo "Response: $RESPONSE_BODY"
echo ""

if [ "$HTTP_STATUS" != "200" ]; then
  echo "❌ Token validation failed!"
  exit 1
fi
echo "✅ Token validation successful!"
echo ""

# Test 4: Login with incorrect password
echo "Test 4: Login with incorrect password"
echo "POST $BASE_URL/api/auth/doctor/login"
WRONG_LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/doctor/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"wrongpassword\"}" \
  -w "\nHTTP_STATUS:%{http_code}")

HTTP_STATUS=$(echo "$WRONG_LOGIN_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$WRONG_LOGIN_RESPONSE" | sed '/HTTP_STATUS/d')

echo "Status: $HTTP_STATUS"
echo "Response: $RESPONSE_BODY"
echo ""

if [ "$HTTP_STATUS" != "401" ]; then
  echo "❌ Should have rejected invalid credentials!"
  exit 1
fi
echo "✅ Invalid credentials correctly rejected!"
echo ""

# Test 5: Validate without token
echo "Test 5: Validate without token"
echo "GET $BASE_URL/api/auth/doctor/validate"
NO_TOKEN_RESPONSE=$(curl -s -X GET "$BASE_URL/api/auth/doctor/validate" \
  -w "\nHTTP_STATUS:%{http_code}")

HTTP_STATUS=$(echo "$NO_TOKEN_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$NO_TOKEN_RESPONSE" | sed '/HTTP_STATUS/d')

echo "Status: $HTTP_STATUS"
echo "Response: $RESPONSE_BODY"
echo ""

if [ "$HTTP_STATUS" != "401" ]; then
  echo "❌ Should have rejected request without token!"
  exit 1
fi
echo "✅ Request without token correctly rejected!"
echo ""

# Test 6: Register with duplicate email
echo "Test 6: Register with duplicate email"
echo "POST $BASE_URL/api/auth/doctor/register"
DUPLICATE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/doctor/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}" \
  -w "\nHTTP_STATUS:%{http_code}")

HTTP_STATUS=$(echo "$DUPLICATE_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$DUPLICATE_RESPONSE" | sed '/HTTP_STATUS/d')

echo "Status: $HTTP_STATUS"
echo "Response: $RESPONSE_BODY"
echo ""

if [ "$HTTP_STATUS" != "409" ]; then
  echo "❌ Should have rejected duplicate email!"
  exit 1
fi
echo "✅ Duplicate email correctly rejected!"
echo ""

# Test 7: Validate doctor token type (should reject user token)
echo "Test 7: Validate token type separation"
echo "Creating a user account to test token type validation..."
USER_EMAIL="testuser$(date +%s)@example.com"
USER_REGISTER=$(curl -s -X POST "$BASE_URL/api/auth/user/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$USER_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

USER_LOGIN=$(curl -s -X POST "$BASE_URL/api/auth/user/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$USER_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

USER_TOKEN=$(echo "$USER_LOGIN" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

echo "Attempting to validate user token on doctor endpoint..."
WRONG_TYPE_RESPONSE=$(curl -s -X GET "$BASE_URL/api/auth/doctor/validate" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -w "\nHTTP_STATUS:%{http_code}")

HTTP_STATUS=$(echo "$WRONG_TYPE_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$WRONG_TYPE_RESPONSE" | sed '/HTTP_STATUS/d')

echo "Status: $HTTP_STATUS"
echo "Response: $RESPONSE_BODY"
echo ""

if [ "$HTTP_STATUS" != "401" ]; then
  echo "❌ Should have rejected user token on doctor endpoint!"
  exit 1
fi
echo "✅ Token type validation working correctly!"
echo ""

# Test 8: Register with invalid email
echo "Test 8: Register with invalid email"
echo "POST $BASE_URL/api/auth/doctor/register"
INVALID_EMAIL_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/doctor/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"notanemail\",\"password\":\"$TEST_PASSWORD\"}" \
  -w "\nHTTP_STATUS:%{http_code}")

HTTP_STATUS=$(echo "$INVALID_EMAIL_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$INVALID_EMAIL_RESPONSE" | sed '/HTTP_STATUS/d')

echo "Status: $HTTP_STATUS"
echo "Response: $RESPONSE_BODY"
echo ""

if [ "$HTTP_STATUS" != "400" ]; then
  echo "❌ Should have rejected invalid email format!"
  exit 1
fi
echo "✅ Invalid email format correctly rejected!"
echo ""

# Test 9: Register with short password
echo "Test 9: Register with short password"
echo "POST $BASE_URL/api/auth/doctor/register"
SHORT_PASSWORD_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/doctor/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"newdoctor@example.com\",\"password\":\"short\"}" \
  -w "\nHTTP_STATUS:%{http_code}")

HTTP_STATUS=$(echo "$SHORT_PASSWORD_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$SHORT_PASSWORD_RESPONSE" | sed '/HTTP_STATUS/d')

echo "Status: $HTTP_STATUS"
echo "Response: $RESPONSE_BODY"
echo ""

if [ "$HTTP_STATUS" != "400" ]; then
  echo "❌ Should have rejected short password!"
  exit 1
fi
echo "✅ Short password correctly rejected!"
echo ""

echo "========================================="
echo "✅ All doctor authentication tests passed!"
echo "========================================="
