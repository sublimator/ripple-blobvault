# find ./test -name "test*.js" -exec node_modules/.bin/mocha --ui tdd -R spec '{}' \;
node_modules/.bin/mocha --ui tdd -R spec test/test-user-create.js \
                                         test/test-user-get.js \
                                         test/test-user-caseinsensitivity-and-uniqueness.js \
                                         test/test-blob-patch.js \
                                         test/test-signature.js \
                                         test/test-usercap.js \
                                         test/test-quota.js \
                                         test/test-email-verification.js
