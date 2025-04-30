Currently ticket details data is retrieved in 2 different ways:

For the ticket tab, it gets data from the "all-dto" route then uses prodScopeIds to retrieve the document information and merge data together. Similarly, for the rejection tab, the data is first retrieved via the all-dto route, but then the documents are retrieved using the "production validation ids" (pvId). This is because we want to retrieve the documents corresponding to the rejected version of the document, not the latest one (prodScopeId retrieves the latest).

This causes several issues. Everywhere document information is used, such as the "action column," the info will always be incorrect because it uses the rejected version of the document (let's say V3), and doesn't change if the doc updates (let's say V4).

To solve this, as described in the ticket, we will give them 2 columns in the rejection tab, one corresponding to the rejected version of the document (V3) and one corresponding to the latest version of the document (V4). This way, the user will be able to see the document info corresponding to the rejected version of the document (V3) and the latest version of the document (V4).

Current data set is:
{
  ...allDtoFields,
  documentInfo: {
    // and this is filled by either the psmId or the pvId fetched document info (depending on the ticket/rejection tab)
  }
}


What we need:
{
  ...allDtoFields,
  documentInfo: {
    // and this is filled by the psmId fetched document info
  },
  rejectedDocumentInfo: {
    // and this is filled by the pvId fetched document info (depending on the ticket/rejection tab)
  },
}

This way, we would have access to both data sets, but we need to take into consideration that the documentInfo field is currently used in several columns, and we might need to conditionally use the rejectedDocumentInfo/documentInfo depending on the current tab.

Also, currently checkboxes are disabled in the ticket tab if there is a pending rejection on the document (let's say V3), but as soon as we regenerate the document (let's say V4), the checkboxes are enabled again, but the rejection might still be pending. You will have to change this logic to use the data from the rejectedDocumentInfo field instead of the documentInfo field.
This paste expires in <1 hour. Public IP access. Share whatever you see with others in seconds with Context.Terms of ServiceReport this
