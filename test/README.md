#Tests

## Database

The tests are hardcoded to use postgresql for the test database.

The database name is `blobvault-test` and the user will be the current unix user
the tests are run under (i.e. $USER)

### Setup

The database will be created and destroyed with each test run. To allow this:

* $ sudo -u postgres createuser $USER -S -R -d
* $ sudo -u postgres psql -d postgres -c "alter user $USER with password 'password';"