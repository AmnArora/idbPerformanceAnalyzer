# Indexed DB Performance Analyzer
URL: idbpa.herokuapp.com
Findings: https://wiki.mypaytm.com/display/Entertainment/Indexed+DB+-+Performance

Indexed DB Performance Analyzer is a tool to measure and test the limits of indexed Db. The following opertions are allowed for now
  - Add  - The only input required is the number of records to be inserted.
  - Fetch - Fetch can be for a single/ multiple record(s) or for fetching all records currently in the Indexed DB. 
    - For fetching one record the ID of the record needs to be mentioned. 
    - For multiple records comma separated values can be used. 
    - All records are fetched when no input value is provided. 
  - Delete - Delete's input works in same way as fetch.
