/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */

define(['N/log', 'N/record'], (log, record) => {

    const afterSubmit = (context) => {
        if (
            context.type !== context.UserEventType.CREATE &&
            context.type !== context.UserEventType.EDIT
        ) {
            return;
        }

        try {
            const newRecord = context.newRecord;
            const poId = newRecord.id;

            // Check if custbodysend_to_celigo is already true
            const currentValue = newRecord.getValue({
                fieldId: 'custbodysend_to_celigo'
            });

            if (currentValue === true) {
                log.audit('PO_SendToCeligo', `PO ${poId} has already been sent to Celigo.`);
                return;
            }

            log.audit('PO_SendToCeligo', `Running for PO #${poId}`);

            record.submitFields({
                type: record.Type.PURCHASE_ORDER,
                id: poId,
                values: {
                    custbodysend_to_celigo: true
                },
                options: {
                    ignoreMandatoryFields: true
                }
            });

            log.audit('PO_SendToCeligo', `custbodysend_to_celigo set to true for PO #${poId}`);
        } catch (e) {
            log.error('PO_SendToCeligo Error', e);
        }
    };

    return { afterSubmit };
});
