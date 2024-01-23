const Dashboard = () => {
    return `SELECT 
    NVL(SUM(OPEN_PICK),0) OPEN_FOR_PICKING_COUNT,
    NVL(SUM(SELF),0) SELF_CHECKED_OUT_COUNT,
    NVL(SUM(OTHERS),0) CHECKED_OUT_BY_OTHER_COUNT,
    NVL(SUM(TOTAL),0) TOTAL_COUNT
    FROM
    (SELECT DISTINCT WDV.DELIVERY_ID,
    (SELECT 1 FROM WSH_NEW_DELIVERIES
      WHERE DELIVERY_ID = WDV.DELIVERY_ID
        AND ATTRIBUTE11 IS NULL) OPEN_PICK,
    (SELECT 1 FROM WSH_NEW_DELIVERIES
      WHERE DELIVERY_ID = WDV.DELIVERY_ID
        AND UPPER(ATTRIBUTE11) = UPPER(:username)) SELF,
    (SELECT 1 FROM WSH_NEW_DELIVERIES
      WHERE DELIVERY_ID = WDV.DELIVERY_ID
        AND UPPER(ATTRIBUTE11) <> UPPER(:username)
        AND ATTRIBUTE11 IS NOT NULL) OTHERS,
        1 TOTAL
    FROM WSH_DELIVERABLES_V WDV
    WHERE WDV.CONTAINER_FLAG = 'N'
      AND WDV.SOURCE_CODE = 'OE'
      AND WDV.RELEASED_STATUS = 'S'
      AND WDV.ORGANIZATION_ID = :invOrgId)
      `;
};
/**
 *
 * @param {*} username
 * @param {*} searchLookupType
 * @param {*} searchValue
 * @param {*} inventoryOrgId
 * @returns
 */
const Search = (username, searchLookupType, searchValue, inventoryOrgId) => {
    let appendQuery;
    let trimScanValue; // = searchValue.replace(/.*?(\s*\d+)/, "$1");
    if (searchLookupType === "D") {
        trimScanValue = searchValue.replace(/[^0-9]+/, "");
        appendQuery = `AND WDV.DELIVERY_ID LIKE NVL('%'|| '${trimScanValue}' || '%',WDV.DELIVERY_ID)`;
    }
    else if (searchLookupType === "S") {
        trimScanValue = searchValue.replace(/[^0-9]+/, "");
        appendQuery = `AND WDV.SOURCE_HEADER_NUMBER LIKE NVL('%'|| '${trimScanValue}' || '%',WDV.SOURCE_HEADER_NUMBER)`;
    }
    else if (searchLookupType === "I") {
        appendQuery = `AND UPPER(WDV.ITEM_DESCRIPTION) LIKE UPPER(NVL('%'|| '${searchValue}' || '%',WDV.ITEM_DESCRIPTION))`;
    }
    else if (searchLookupType === "DT") {
        appendQuery = `AND UPPER(OOHA.ATTRIBUTE3) LIKE UPPER(NVL('%'|| '${searchValue}' || '%',OOHA.ATTRIBUTE3))`;
    }
    return `SELECT DELIVERY,
    PROMISE_DATE,
    PICKED_BY,
    SEQ,
    SO_DISPLAY,
    LINES_COUNT AS ITEM_COUNT,
    XX_DEMAND_TYPE_CATEGORY_FUNC('DEMAND',DELIVERY,${inventoryOrgId}) DEMAND_TYPE,
    XX_DEMAND_TYPE_CATEGORY_FUNC('CATEGORY',DELIVERY,${inventoryOrgId}) ITEM_CATEGORY,
    (SELECT UPPER(SUBSTR(HZP.PARTY_NAME,1,4))
      FROM HZ_PARTIES HZP, HZ_CUST_ACCOUNTS HCA
      WHERE HCA.PARTY_ID = HZP.PARTY_ID
        AND HCA.CUST_ACCOUNT_ID = CUSTOMER_ID) CUSTOMER_NAME,
  ROW_NUM FROM
  (SELECT DELIVERY,
    PROMISE_DATE,
    PICKED_BY,
    SEQ,
    SO_DISPLAY,
    SUM(LINE_COUNT) LINES_COUNT,
    CUSTOMER_ID,
    ROW_NUMBER() OVER(ORDER BY PROMISE_DATE,DELIVERY) ROW_NUM
    FROM
  (SELECT WDV.DELIVERY_ID DELIVERY,
  CASE WHEN WND.ATTRIBUTE11 IS NULL
        THEN 'Ready to be picked'  
        ELSE  WND.ATTRIBUTE11
        END    PICKED_BY,
  CASE WHEN WND.ATTRIBUTE11 = UPPER('${username}')
        THEN 1
        WHEN WND.ATTRIBUTE11 <> UPPER('${username}') AND WND.ATTRIBUTE11 IS NOT NULL
        THEN 3
        ELSE 2 END SEQ,
  decode(min(OOLA.PROMISE_DATE) OVER (PARTITION BY WDV.DELIVERY_ID),NULL,
        min(OOLA.REQUEST_DATE)OVER (PARTITION BY WDV.DELIVERY_ID),min(OOLA.PROMISE_DATE)OVER (PARTITION BY WDV.DELIVERY_ID)) promise_date,                                            
    CASE
    WHEN COUNT(DISTINCT WDV.SOURCE_HEADER_NUMBER) OVER (PARTITION BY WDV.DELIVERY_ID ) > 1 THEN
        'Multiple'
    WHEN COUNT(DISTINCT WDV.SOURCE_HEADER_NUMBER) OVER (PARTITION BY WDV.DELIVERY_ID ) = 1 THEN
        ''||WDV.SOURCE_HEADER_NUMBER
    END SO_DISPLAY,
  COUNT(WDV.SOURCE_LINE_ID) LINE_COUNT,
  WDV.CUSTOMER_ID
  FROM WSH_DELIVERABLES_V WDV,
      WSH_NEW_DELIVERIES WND,
      OE_ORDER_HEADERS_ALL OOHA,
      OE_ORDER_LINES_ALL OOLA
  WHERE WND.DELIVERY_ID=WDV.DELIVERY_ID
  AND WDV.SOURCE_HEADER_ID = OOHA.HEADER_ID
  AND OOHA.HEADER_ID = OOLA.HEADER_ID
  AND OOLA.LINE_ID = WDV.SOURCE_LINE_ID
  AND WDV.ORG_ID = OOHA.ORG_ID
  AND CONTAINER_FLAG = 'N'
  AND SOURCE_CODE = 'OE'
  AND RELEASED_STATUS = 'S'
  ${appendQuery}
  AND WDV.ORGANIZATION_ID = ${inventoryOrgId}
  GROUP BY WDV.DELIVERY_ID,
      WDV.SOURCE_HEADER_NUMBER,
      OOLA.PROMISE_DATE,
      OOLA.REQUEST_DATE,
      WND.ATTRIBUTE11,
      WDV.CUSTOMER_ID)
  GROUP BY DELIVERY,
      PICKED_BY,
      SEQ,
      PROMISE_DATE,
      SO_DISPLAY,
      CUSTOMER_ID)
      WHERE  ROWNUM BETWEEN 0 AND nvl((select flv.attribute1
                        from fnd_lookup_values_vl flv,
                          mtl_parameters mp
                        where flv.lookup_type = 'XXMB_OUTBOUND_TILES_RECORDS' 
                        and flv.enabled_flag = 'Y'
                        and flv.lookup_code = mp.organization_code
                        and mp.attribute3 = 'RAD'
                        and mp.organization_id = ${inventoryOrgId}),(select attribute1
                        from fnd_lookup_values_vl flv
                        where flv.lookup_type = 'XXMB_OUTBOUND_TILES_RECORDS' 
                        and flv.enabled_flag = 'Y'
                        and flv.meaning = 'ALL'))
  ORDER BY SEQ,ROW_NUM
  `;
};
/**
 *
 * @param {*} username
 * @param {*} inventoryOrgId
 * @returns
 */
const List = (username, inventoryOrgId) => {
    return `select delivery,
    promise_date,
    picked_by,
    seq,
    so_display,
    lines_count as item_count,
    xx_demand_type_category_func('DEMAND',delivery,${inventoryOrgId}) demand_type,
    xx_demand_type_category_func('CATEGORY',delivery,${inventoryOrgId}) item_category,
    (select upper(substr(hzp.party_name,1,4))
      from hz_parties hzp, hz_cust_accounts hca
      where hca.party_id = hzp.party_id
        and hca.cust_account_id = customer_id) customer_name,
  row_num from
  (select delivery,
    promise_date,
    picked_by,
    seq,
    so_display,
    sum(line_count) lines_count,
    customer_id,
    row_number() over(order by promise_date,delivery) row_num
    from
  (select wdv.delivery_id delivery,
  wnd.attribute11 picked_by,
  1 seq,
  decode(min(oola.promise_date) over (partition by wdv.delivery_id),null,
        min(oola.request_date)over (partition by wdv.delivery_id),min(oola.promise_date)over (partition by wdv.delivery_id)) promise_date,
    case
    when count(distinct wdv.source_header_number) over (partition by wdv.delivery_id ) > 1 then
        'Multiple'
    when count(distinct wdv.source_header_number) over (partition by wdv.delivery_id ) = 1 then
        ''||wdv.source_header_number
    end so_display,
  count(wdv.source_line_id) line_count,
  wdv.customer_id
  from wsh_deliverables_v wdv,
  wsh_new_deliveries wnd,
  oe_order_headers_all ooha,
  oe_order_lines_all oola
  where wnd.delivery_id=wdv.delivery_id
  and wdv.source_header_id = ooha.header_id
  and ooha.header_id = oola.header_id
  and oola.line_id = wdv.source_line_id
  and wdv.org_id = ooha.org_id
  and oola.flow_status_code  <> 'CANCELLED'
  and wdv.container_flag = 'N'
  and wdv.source_code = 'OE'
  and wdv.released_status = 'S'
  and upper(wnd.attribute11) = upper('${username}')
  and wdv.organization_id = ${inventoryOrgId}
  group by wdv.delivery_id,
      wdv.source_header_number,
      oola.promise_date,
      oola.request_date,
      wnd.attribute11,
      wdv.customer_id)
  group by delivery,
      picked_by,
      seq,
      promise_date,
      so_display,
      customer_id
  union
  select * from
  (select delivery,
    promise_date,
    picked_by,
    seq,
    so_display,
    sum(line_count) lines_count,
    customer_id,
    row_number() over(order by promise_date,delivery) row_num
    from
  (select wdv.delivery_id delivery,
  case when wnd.attribute11 is null then 'Ready to be picked' else wnd.attribute11 end picked_by,
  case when wnd.attribute11 <> upper('${username}') then 3
  when wnd.attribute11 is null then 2 end seq,
  decode(min(oola.promise_date) over (partition by wdv.delivery_id),null,
        min(oola.request_date)over (partition by wdv.delivery_id),min(oola.promise_date)over (partition by wdv.delivery_id)) promise_date,
    case
    when count(distinct wdv.source_header_number) over (partition by wdv.delivery_id ) > 1 then
        'Multiple'
    when count(distinct wdv.source_header_number) over (partition by wdv.delivery_id ) = 1 then
        ''||wdv.source_header_number
    end so_display,
  count(wdv.source_line_id) line_count,
  wdv.customer_id
  from wsh_deliverables_v wdv,
  wsh_new_deliveries wnd,
  oe_order_headers_all ooha,
  oe_order_lines_all oola
  where wnd.delivery_id=wdv.delivery_id
  and wdv.source_header_id = ooha.header_id
  and ooha.header_id = oola.header_id
  and oola.line_id = wdv.source_line_id
  and wdv.org_id = ooha.org_id
  and oola.flow_status_code  <> 'CANCELLED'
  and container_flag = 'N'
  and source_code = 'OE'
  and released_status = 'S'
  and wdv.organization_id = ${inventoryOrgId}
  group by wdv.delivery_id,
      wdv.source_header_number,
      oola.promise_date,
      oola.request_date,
      wnd.attribute11,
      wdv.customer_id)
  group by delivery,
      picked_by,
      seq,
      promise_date,
      so_display,
      customer_id
  order by seq asc)
  where rownum between 0 and nvl((select flv.attribute1
            from fnd_lookup_values_vl flv,
              mtl_parameters mp
            where flv.lookup_type = 'XXMB_OUTBOUND_TILES_RECORDS' 
            and flv.enabled_flag = 'Y'
            and flv.lookup_code = mp.organization_code
            and mp.attribute3 = 'RAD'
            and mp.organization_id = ${inventoryOrgId}),(select attribute1
            from fnd_lookup_values_vl flv
            where flv.lookup_type = 'XXMB_OUTBOUND_TILES_RECORDS' 
            and flv.enabled_flag = 'Y'
            and flv.meaning = 'ALL'))
            order by seq,row_num asc)`;
};
/**
 *
 * @param {*} username
 * @param {*} input1
 * @param {*} input2
 * @param {*} input3
 * @param {*} inventoryOrgId
 */
const Filter = (username, input1, input2, input3, inventoryOrgId) => {
    return `select delivery,
    promise_date,
    picked_by,
    seq,
    so_display,
    lines_count As item_count,
    XX_DEMAND_TYPE_CATEGORY_FUNC('DEMAND',DELIVERY,${inventoryOrgId}) DEMAND_TYPE,
    XX_DEMAND_TYPE_CATEGORY_FUNC('CATEGORY',DELIVERY,${inventoryOrgId}) ITEM_CATEGORY,
    (SELECT UPPER(SUBSTR(HZP.PARTY_NAME,1,4))
      FROM HZ_PARTIES HZP, HZ_CUST_ACCOUNTS HCA
      WHERE HCA.PARTY_ID = HZP.PARTY_ID
        AND HCA.CUST_ACCOUNT_ID = CUSTOMER_ID) CUSTOMER_NAME,
  ROW_NUM from
  (SELECT DELIVERY,
    PROMISE_DATE,
    PICKED_BY,
    SEQ,
    SO_DISPLAY,
    SUM(LINE_COUNT) LINES_COUNT,
    CUSTOMER_ID,
    ROW_NUMBER() OVER(ORDER BY PROMISE_DATE,DELIVERY) ROW_NUM
    FROM
  (SELECT WDV.DELIVERY_ID DELIVERY,
  WND.ATTRIBUTE11 PICKED_BY,
  1 SEQ,
  decode(min(OOLA.PROMISE_DATE) OVER (PARTITION BY WDV.DELIVERY_ID),NULL,
  min(OOLA.REQUEST_DATE)OVER (PARTITION BY WDV.DELIVERY_ID),min(OOLA.PROMISE_DATE)OVER (PARTITION BY WDV.DELIVERY_ID)) promise_date,                                            
    CASE
    WHEN COUNT(DISTINCT WDV.SOURCE_HEADER_NUMBER) OVER (PARTITION BY WDV.DELIVERY_ID ) > 1 THEN
        'Multiple'
    WHEN COUNT(DISTINCT WDV.SOURCE_HEADER_NUMBER) OVER (PARTITION BY WDV.DELIVERY_ID ) = 1 THEN
        ''||WDV.SOURCE_HEADER_NUMBER
    END SO_DISPLAY,
  COUNT(WDV.SOURCE_LINE_ID) LINE_COUNT,
  WDV.CUSTOMER_ID
  FROM WSH_DELIVERABLES_V WDV,
      WSH_NEW_DELIVERIES WND,
      OE_ORDER_HEADERS_ALL OOHA,
      OE_ORDER_LINES_ALL OOLA
  WHERE WND.DELIVERY_ID=WDV.DELIVERY_ID
  AND WDV.SOURCE_HEADER_ID = OOHA.HEADER_ID
  AND OOHA.HEADER_ID = OOLA.HEADER_ID
  AND OOLA.LINE_ID = WDV.SOURCE_LINE_ID
  AND WDV.ORG_ID = OOHA.ORG_ID
  AND CONTAINER_FLAG = 'N'
  AND SOURCE_CODE = 'OE'
  AND RELEASED_STATUS = 'S'
  AND UPPER(WND.ATTRIBUTE11) = UPPER('${username}')
  AND WDV.ORGANIZATION_ID = ${inventoryOrgId}
  AND 'SELF' = UPPER('${input1}')
  GROUP BY WDV.DELIVERY_ID,
      WDV.SOURCE_HEADER_NUMBER,
      OOLA.PROMISE_DATE,
      OOLA.REQUEST_DATE,
      WND.ATTRIBUTE11,
      WDV.CUSTOMER_ID)
  GROUP BY DELIVERY,
      PICKED_BY,
      SEQ,
      PROMISE_DATE,
      SO_DISPLAY,
      CUSTOMER_ID
  UNION
  SELECT * FROM
  (SELECT DELIVERY,
    PROMISE_DATE,
    PICKED_BY,
    SEQ,
    SO_DISPLAY,
    SUM(LINE_COUNT) LINES_COUNT,
    CUSTOMER_ID,
    ROW_NUMBER() OVER(ORDER BY PROMISE_DATE,DELIVERY) ROW_NUM
    FROM
  (SELECT WDV.DELIVERY_ID DELIVERY,
  CASE WHEN WND.ATTRIBUTE11 IS NULL THEN 'Read to be picked' ELSE WND.ATTRIBUTE11 END PICKED_BY,
  CASE WHEN WND.ATTRIBUTE11 <> UPPER('${username}') THEN 3
  WHEN WND.ATTRIBUTE11 IS NULL THEN 2 END SEQ,
  decode(min(OOLA.PROMISE_DATE) OVER (PARTITION BY WDV.DELIVERY_ID),NULL,
  min(OOLA.REQUEST_DATE)OVER (PARTITION BY WDV.DELIVERY_ID),min(OOLA.PROMISE_DATE)OVER (PARTITION BY WDV.DELIVERY_ID)) promise_date,                                            
    CASE
    WHEN COUNT(DISTINCT WDV.SOURCE_HEADER_NUMBER) OVER (PARTITION BY WDV.DELIVERY_ID ) > 1 THEN
        'Multiple'
    WHEN COUNT(DISTINCT WDV.SOURCE_HEADER_NUMBER) OVER (PARTITION BY WDV.DELIVERY_ID ) = 1 THEN
        ''||WDV.SOURCE_HEADER_NUMBER
    END SO_DISPLAY,
  COUNT(WDV.SOURCE_LINE_ID) LINE_COUNT,
  WDV.CUSTOMER_ID
  FROM WSH_DELIVERABLES_V WDV,
      WSH_NEW_DELIVERIES WND,
      OE_ORDER_HEADERS_ALL OOHA,
      OE_ORDER_LINES_ALL OOLA
  WHERE WND.DELIVERY_ID=WDV.DELIVERY_ID
  AND WDV.SOURCE_HEADER_ID = OOHA.HEADER_ID
  AND OOHA.HEADER_ID = OOLA.HEADER_ID
  AND OOLA.LINE_ID = WDV.SOURCE_LINE_ID
  AND WDV.ORG_ID = OOHA.ORG_ID
  AND CONTAINER_FLAG = 'N'
  AND SOURCE_CODE = 'OE'
  AND RELEASED_STATUS = 'S'
  AND WND.ATTRIBUTE11 IS NULL
  AND 'AVAILABLE' = UPPER('${input2}')
  AND WDV.ORGANIZATION_ID = ${inventoryOrgId}
  GROUP BY WDV.DELIVERY_ID,
      WDV.SOURCE_HEADER_NUMBER,
      OOLA.PROMISE_DATE,
      OOLA.REQUEST_DATE,
      WND.ATTRIBUTE11,
      WDV.CUSTOMER_ID)
  GROUP BY DELIVERY,
      PICKED_BY,
      SEQ,
      PROMISE_DATE,
      SO_DISPLAY,
      CUSTOMER_ID
  UNION
  SELECT DELIVERY,
    PROMISE_DATE,
    PICKED_BY,
    SEQ,
    SO_DISPLAY,
    SUM(LINE_COUNT) LINES_COUNT,CUSTOMER_ID,
    ROW_NUMBER() OVER(ORDER BY PROMISE_DATE,DELIVERY) ROW_NUM
    FROM
  (SELECT WDV.DELIVERY_ID DELIVERY,
    WND.ATTRIBUTE11 PICKED_BY,
  CASE WHEN WND.ATTRIBUTE11 <> UPPER('${username}') THEN 3 END SEQ,
  decode(min(OOLA.PROMISE_DATE) OVER (PARTITION BY WDV.DELIVERY_ID),NULL,
  min(OOLA.REQUEST_DATE)OVER (PARTITION BY WDV.DELIVERY_ID),min(OOLA.PROMISE_DATE)OVER (PARTITION BY WDV.DELIVERY_ID)) promise_date,                                            
    CASE
    WHEN COUNT(DISTINCT WDV.SOURCE_HEADER_NUMBER) OVER (PARTITION BY WDV.DELIVERY_ID ) > 1 THEN
        'Multiple'
    WHEN COUNT(DISTINCT WDV.SOURCE_HEADER_NUMBER) OVER (PARTITION BY WDV.DELIVERY_ID ) = 1 THEN
        ''||WDV.SOURCE_HEADER_NUMBER
    END SO_DISPLAY,
  COUNT(WDV.SOURCE_LINE_ID) LINE_COUNT,
  WDV.CUSTOMER_ID
  FROM WSH_DELIVERABLES_V WDV,
      WSH_NEW_DELIVERIES WND,
      OE_ORDER_HEADERS_ALL OOHA,
      OE_ORDER_LINES_ALL OOLA
  WHERE WND.DELIVERY_ID=WDV.DELIVERY_ID
  AND WDV.SOURCE_HEADER_ID = OOHA.HEADER_ID
  AND OOHA.HEADER_ID = OOLA.HEADER_ID
  AND OOLA.LINE_ID = WDV.SOURCE_LINE_ID
  AND WDV.ORG_ID = OOHA.ORG_ID
  AND CONTAINER_FLAG = 'N'
  AND SOURCE_CODE = 'OE'
  AND RELEASED_STATUS = 'S'
  AND WND.ATTRIBUTE11 IS NOT NULL AND WND.ATTRIBUTE11 <> UPPER('${username}')
  AND 'OTHERS' = UPPER('${input3}')
  AND WDV.ORGANIZATION_ID = ${inventoryOrgId}
  GROUP BY WDV.DELIVERY_ID,
      WDV.SOURCE_HEADER_NUMBER,
      OOLA.PROMISE_DATE,
      OOLA.REQUEST_DATE,
      WND.ATTRIBUTE11,
      WDV.CUSTOMER_ID)
  GROUP BY DELIVERY,
      PICKED_BY,
      SEQ,
      PROMISE_DATE,
      SO_DISPLAY,
      CUSTOMER_ID
      ORDER BY SEQ ASC)
                    WHERE ROWNUM BETWEEN 0 AND NVL((SELECT FLV.ATTRIBUTE6
                          FROM FND_LOOKUP_VALUES_VL FLV,
                            MTL_PARAMETERS MP
                          WHERE FLV.LOOKUP_TYPE = 'XXMB_OUTBOUND_TILES_RECORDS'
                          AND FLV.ENABLED_FLAG = 'Y'
                          AND FLV.LOOKUP_CODE = MP.ORGANIZATION_CODE
                          AND MP.ATTRIBUTE3 = 'RAD'
                          AND MP.ORGANIZATION_ID = ${inventoryOrgId}),(SELECT FLV.ATTRIBUTE6
                          FROM FND_LOOKUP_VALUES_VL FLV
                          WHERE FLV.LOOKUP_TYPE = 'XXMB_OUTBOUND_TILES_RECORDS'
                          AND FLV.ENABLED_FLAG = 'Y'
                          AND FLV.MEANING = 'ALL'))
            ORDER BY SEQ,ROW_NUM ASC)`;
};
function SearchBySalesOrder(sonumber, inventoryOrgId) {
    return `SELECT DISTINCT WDV.SOURCE_HEADER_NUMBER ORDER_NUMBER FROM WSH_DELIVERABLES_V WDV WHERE CONTAINER_FLAG = 'N' AND SOURCE_CODE = 'OE' AND RELEASED_STATUS = 'S' AND WDV.SOURCE_HEADER_NUMBER LIKE NVL('%'|| '${sonumber}' || '%',WDV.SOURCE_HEADER_NUMBER) AND WDV.ORGANIZATION_ID = ${inventoryOrgId}`;
}
function SearchByItemDescription(itemDescription, inventoryOrgId) {
    return ` SELECT DISTINCT WDV.ITEM_DESCRIPTION FROM WSH_DELIVERABLES_V WDV WHERE CONTAINER_FLAG = 'N' AND SOURCE_CODE = 'OE' AND RELEASED_STATUS = 'S' AND UPPER(WDV.ITEM_DESCRIPTION) LIKE UPPER(NVL('%'|| '${itemDescription}' || '%',WDV.ITEM_DESCRIPTION)) AND WDV.ORGANIZATION_ID = ${inventoryOrgId}`;
}
function SearchByDeliveryId(deliveryId, inventoryOrgId) {
    return `SELECT DISTINCT WDV.DELIVERY_ID DELIVERY FROM WSH_DELIVERABLES_V WDV WHERE CONTAINER_FLAG = 'N' AND SOURCE_CODE = 'OE' AND RELEASED_STATUS = 'S' AND WDV.DELIVERY_ID LIKE NVL('%'|| '${deliveryId}' || '%',WDV.DELIVERY_ID) AND WDV.ORGANIZATION_ID = ${inventoryOrgId}`;
}
function SearchByDemandType(demandType) {
    return `SELECT MEANING FROM FND_LOOKUP_VALUES
    WHERE LOOKUP_TYPE ='DEMAND_CLASS'  
    AND ENABLED_FLAG ='Y'  
    AND UPPER(MEANING) LIKE UPPER(NVL('%'|| '${demandType}' || '%',MEANING))  
    AND SYSDATE BETWEEN NVL(START_DATE_ACTIVE,SYSDATE-1) AND NVL(END_DATE_ACTIVE,SYSDATE+1)  
    ORDER BY 1`;
}
module.exports = {
    Dashboard,
    Search,
    List,
    Filter,
    SearchByDeliveryId,
    SearchByDemandType,
    SearchByItemDescription,
    SearchBySalesOrder,
};
//# sourceMappingURL=index.js.map