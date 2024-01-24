const Dashboard = (): string => {
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
  const Search = (username: string, searchLookupType: string, searchValue: string, inventoryOrgId: string): string => {
    let appendQuery: string;
    let trimScanValue: string; // = searchValue.replace(/.*?(\s*\d+)/, "$1");
    if (searchLookupType === "D") {
      trimScanValue = searchValue.replace(/[^0-9]+/, "");
      appendQuery = `AND WDV.DELIVERY_ID LIKE NVL('%'|| '${trimScanValue}' || '%',WDV.DELIVERY_ID)`;
    } else if (searchLookupType === "S") {
      trimScanValue = searchValue.replace(/[^0-9]+/, "");
      appendQuery = `AND WDV.SOURCE_HEADER_NUMBER LIKE NVL('%'|| '${trimScanValue}' || '%',WDV.SOURCE_HEADER_NUMBER)`;
    } else if (searchLookupType === "I") {
      appendQuery = `AND UPPER(WDV.ITEM_DESCRIPTION) LIKE UPPER(NVL('%'|| '${searchValue}' || '%',WDV.ITEM_DESCRIPTION))`;
    } else if (searchLookupType === "DT") {
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
  const List = (username: string, inventoryOrgId: string): string => {
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
  const Filter = (username: string, input1: string, input2: string, input3: string, inventoryOrgId: string): string => {
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
  
  function SearchBySalesOrder(sonumber: string, inventoryOrgId: string): string {
    return `SELECT DISTINCT WDV.SOURCE_HEADER_NUMBER ORDER_NUMBER FROM WSH_DELIVERABLES_V WDV WHERE CONTAINER_FLAG = 'N' AND SOURCE_CODE = 'OE' AND RELEASED_STATUS = 'S' AND WDV.SOURCE_HEADER_NUMBER LIKE NVL('%'|| '${sonumber}' || '%',WDV.SOURCE_HEADER_NUMBER) AND WDV.ORGANIZATION_ID = ${inventoryOrgId}`;
  }
  
  function SearchByItemDescription(itemDescription: string, inventoryOrgId: string): string {
    return ` SELECT DISTINCT WDV.ITEM_DESCRIPTION FROM WSH_DELIVERABLES_V WDV WHERE CONTAINER_FLAG = 'N' AND SOURCE_CODE = 'OE' AND RELEASED_STATUS = 'S' AND UPPER(WDV.ITEM_DESCRIPTION) LIKE UPPER(NVL('%'|| '${itemDescription}' || '%',WDV.ITEM_DESCRIPTION)) AND WDV.ORGANIZATION_ID = ${inventoryOrgId}`;
  }
  
  function SearchByDeliveryId(deliveryId: string, inventoryOrgId: string): string {
    return `SELECT DISTINCT WDV.DELIVERY_ID DELIVERY FROM WSH_DELIVERABLES_V WDV WHERE CONTAINER_FLAG = 'N' AND SOURCE_CODE = 'OE' AND RELEASED_STATUS = 'S' AND WDV.DELIVERY_ID LIKE NVL('%'|| '${deliveryId}' || '%',WDV.DELIVERY_ID) AND WDV.ORGANIZATION_ID = ${inventoryOrgId}`;
  }
  
  function SearchByDemandType(demandType: string): string {
    return `SELECT MEANING FROM FND_LOOKUP_VALUES
    WHERE LOOKUP_TYPE ='DEMAND_CLASS'  
    AND ENABLED_FLAG ='Y'  
    AND UPPER(MEANING) LIKE UPPER(NVL('%'|| '${demandType}' || '%',MEANING))  
    AND SYSDATE BETWEEN NVL(START_DATE_ACTIVE,SYSDATE-1) AND NVL(END_DATE_ACTIVE,SYSDATE+1)  
    ORDER BY 1`;
  }

  /**
 * Get subinventory details
 * @param {*} inventoryOrgId
 * @param {*} soLineId
 * @returns subinventory code, source location
 */
const SourceSubInventoryDetails = (inventoryOrgId: string, transactionTempId: string): string => {
  return `SELECT  SUBINVENTORY_CODE sub_inventory,(SELECT    segment1
    || '.'
    || segment2
    || '.'
    || segment3
    || '.'
    || segment4
    || '.'
    || segment5
    || '.'
    || segment6
    || '.'
    || segment7
    || '.'
    || segment8
    || '.'
    || segment9
    || '.'
    || segment10   
FROM MTL_ITEM_LOCATIONS
WHERE inventory_location_id = mtt.locator_id) SOURCE_LOC
FROM mtl_material_transactions_temp mtt
WHERE ORGANIZATION_ID = ${inventoryOrgId} AND mtt.TRANSACTION_TEMP_ID = ${transactionTempId}
            `;
};

/**
 * Detsination Sub Inventory Details
 * @param {*} inventoryOrgId
 * @returns
 */
const DestinationSubInventoryDetails = (inventoryOrgId: string): string => {
  return `SELECT SECONDARY_INVENTORY_NAME sub_inventory
      FROM MTL_SECONDARY_INVENTORIES
     WHERE ORGANIZATION_ID = ${inventoryOrgId}`;
};

/**
 *
 * @param {*} inventoryOrgId
 * @param {*} subinventory
 * @param {*} palletVal
 * @returns List of Pallets available or searched Pallet Value
 */
const PalleteLOV = (inventoryOrgCode: string, palletVal: string): string => {
  return `
  SELECT MEANING PALLET,ATTRIBUTE2 SUBINVENTORY_CODE
           FROM FND_LOOKUP_VALUES
          WHERE LOOKUP_TYPE = 'AMZ_STOCK_LOCATORS'
            AND ATTRIBUTE1 = '${inventoryOrgCode}'
            AND MEANING =  NVL('${palletVal}',MEANING)`;
};

/**
 *
 * @param {*} inventoryOrgId
 * @param {*} subinventory
 * @param {*} palletVal
 * @param {*} cageVal
 * @returns Cage List available or searched cage value
 */
const CageLOV = (inventoryOrgCode: string, palletVal: string, cageVal: string): string => {
  return `SELECT DESCRIPTION CAGE
  FROM FND_LOOKUP_VALUES
 WHERE LOOKUP_TYPE = 'AMZ_STOCK_LOCATORS'
   AND ATTRIBUTE1 = '${inventoryOrgCode}'
   AND DESCRIPTION = NVL('${palletVal}',DESCRIPTION)
   AND MEANING = NVL('${cageVal}',MEANING)`;
};

const ToteLOV = (inventoryOrgCode: string, palletVal: string, cageVal: string, toteVal: string): string => {
  return ` SELECT TAG TOTE
  FROM FND_LOOKUP_VALUES
 WHERE LOOKUP_TYPE = 'AMZ_STOCK_LOCATORS'
   AND ATTRIBUTE1 = '${inventoryOrgCode}'
   AND MEANING = NVL('${palletVal}',MEANING)
   AND DESCRIPTION = NVL('${cageVal}',DESCRIPTION)
   and TAG = NVL('${toteVal}',TAG)`;
};

const PickupLookupPalletCageTote = (
  inventoryOrgCode: string,
  palletVal: string,
  cageVal: string,
  toteVal: string
): string => {
  return `SELECT '0' CAGE, '0' TOTE,'0' PALLET, null SUBINVENTORY_CODE from dual
  union SELECT DESCRIPTION CAGE, TAG TOTE, MEANING PALLET,ATTRIBUTE2 SUBINVENTORY_CODE
  FROM FND_LOOKUP_VALUES
 WHERE LOOKUP_TYPE = 'AMZ_STOCK_LOCATORS'
   AND ATTRIBUTE1 = '${inventoryOrgCode}'
   ${palletVal ? `AND MEANING = NVL('${palletVal}',MEANING)` : ``}
   ${cageVal ? `AND DESCRIPTION = NVL('${cageVal}',DESCRIPTION)` : ``}
   ${toteVal ? `and TAG = NVL('${toteVal}',TAG)` : ``}`;
};

const GetLinesCountBasedOnSO = (inventoryOrgId: string, soNumber: string, soLineId: string): string => {
  return `select count(SOURCE_Line_NUMBER) Lines,sum(REQUESTED_QUANTITY) UNITS
    from   WSH_DELIVERABLES_V    where SOURCE_HEADER_NUMBER = ${soNumber} and organization_id = ${inventoryOrgId} and SOURCE_LINE_ID= ${soLineId}`;
};

/**
 *
 * @param {*} inventoryOrgId
 * @param {*} soNumber
 * @returns
 */
const GetSoLinesDetails = (
  inventoryOrgId: string,
  soNumber: string,
  soLineId: string,
  transactionTempId: string,
  deliveryId: string
): string => {
  return `SELECT mv.request_number,
  wv.SOURCE_HEADER_NUMBER ORDER_NUMBER,
  wv.move_order_line_id,
  wv.SOURCE_LINE_NUMBER SO_LINE,
  wv.SOURCE_HEADER_ID AS order_header_id,
  wv.SOURCE_LINE_ID,
  mv.inventory_item_id,
  XXMB_UTILITY_PKG.ITEM_NUMBER (mv.inventory_item_id, mv.organization_id) ITEM,
  XXMB_UTILITY_PKG.ITEM_DESC (mv.inventory_item_id, mv.organization_id) DESCRIPTION,
  XXMB_UTILITY_PKG.ITEM_SERIAL (mv.inventory_item_id, mv.organization_id) ITEM_TYPE,
  XX_DEMAND_TYPE_CATEGORY_FUNC('CATEGORY', WV.DELIVERY_ID, mv.ORGANIZATION_ID) ITEM_CATEGORY, -- XXMB_UTILITY_PKG.ITEM_ONHAND(mv.inventory_item_id,mv.organization_id) ONHAND_QTY,
  mmtt.TRANSACTION_QUANTITY REQUESTED_QUANTITY,
  XXMB_UTILITY_PKG.mo_save(wv.move_order_line_id, ${inventoryOrgId},mmtt.transaction_temp_id) status ,
  UOM_CODE UOM,
  wv.move_order_line_id,
  mmtt.move_order_header_id,
  mmtt.transaction_temp_id,
  mmtt.transaction_header_id
  FROM MTL_TXN_REQUEST_LINES_V mv,
      WSH_DELIVERABLES_V wv,
      mtl_material_transactions_temp mmtt
WHERE mv.organization_id = wv.organization_id
  and mmtt.move_order_line_id= wv.move_order_line_id
  AND TXN_SOURCE_LINE_DETAIL_ID = DELIVERY_LINE_ID
AND wv.CONTAINER_FLAG = 'N'
  AND wv.SOURCE_CODE = 'OE'
  AND wv.RELEASED_STATUS = 'S'
  AND mv.organization_id = ${inventoryOrgId}
  AND wv.delivery_id = ${deliveryId}
  AND wv.SOURCE_HEADER_NUMBER = ${soNumber}
  AND wv.SOURCE_LINE_ID = ${soLineId}
and mmtt.TRANSACTION_TEMP_ID = ${transactionTempId}
  AND -1 = -1
  AND (mv.move_order_type = 3
  AND mv.line_status IN (3,7,9))
ORDER BY REQUEST_NUMBER,
      MOVE_ORDER_TYPE_NAME,
      LINE_NUMBER`;
};

/**
 * @param {*} inventoryOrgId
 * @param {*} deliveryId
 * @returns
 */
const UpdateAutoPopulateFullPickQty = (inventoryOrgId: string, deliveryId: string): string => {
  return `
  update
      mtl_material_transactions_temp
set
      TRANSACTION_QUANTITY = (
            select
                  quantity
            from
                  MTL_TXN_REQUEST_LINES_V
            where
                  line_id = move_order_line_id
      )
where
      organization_id = ${inventoryOrgId}
      AND move_order_line_id in (
            select
                  line_id
            from
                  MTL_TXN_REQUEST_LINES_V mv,
                  WSH_DELIVERABLES_V wv
            WHERE
                  mv.organization_id = wv.organization_id
                  AND TXN_SOURCE_LINE_DETAIL_ID = DELIVERY_LINE_ID
                  AND mv.organization_id = ${inventoryOrgId}
                  AND wv.delivery_id = ${deliveryId}
                  AND -1 = -1
                  AND (
                        mv.move_order_type = 3
                        AND mv.line_status IN (3, 7, 9)
                  )
      )
  `;
};

/**
 *
 * @param {*} inventoryOrgId
 * @param {*} deliveryId
 * @param {*} itemDesc
 * @returns
 */
const SearchPickDetails = (inventoryOrgId: string, deliveryId: string, itemDesc: string): string => {
  return `SELECT  
      request_number,SOURCE_HEADER_NUMBER ORDER_NUMBER,
      SOURCE_LINE_NUMBER SO_LINE,mv.inventory_item_id,
      XXMB_UTILITY_PKG.ITEM_NUMBER (mv.inventory_item_id,mv.organization_id) ITEM,
      XXMB_UTILITY_PKG.ITEM_DESC (mv.inventory_item_id,mv.organization_id) DESCRIPTION,
        XXMB_UTILITY_PKG.ITEM_SERIAL (mv.inventory_item_id,mv.organization_id) ITEM_TYPE,
    XX_DEMAND_TYPE_CATEGORY_FUNC('CATEGORY',WV.DELIVERY_ID,mv.ORGANIZATION_ID) ITEM_CATEGORY,
      XXMB_UTILITY_PKG.ITEM_ONHAND(mv.inventory_item_id,mv.organization_id) ONHAND_QTY,
      QUANTITY REQUESTED_QUANTITY, decode((quantity_delivered-quantity),NULL,0,(quantity-quantity_delivered)) Remaining_qty,UOM_CODE UOM   
    FROM 
      MTL_TXN_REQUEST_LINES_V mv,WSH_DELIVERABLES_V wv
  WHERE 
      mv.organization_id = wv.organization_id
  AND TXN_SOURCE_LINE_DETAIL_ID = DELIVERY_LINE_ID
  AND mv.organization_id = ${inventoryOrgId}
  AND wv.delivery_id = ${deliveryId}
  AND upper(XXMB_UTILITY_PKG.ITEM_DESC (mv.inventory_item_id,mv.organization_id)) like '%${itemDesc}%'
  AND -1 = -1
  AND (mv.move_order_type = 3 AND mv.line_status IN (3, 7, 9))
  ORDER BY REQUEST_NUMBER, MOVE_ORDER_TYPE_NAME, LINE_NUMBER`;
};

/**
 *
 * @param {*} deliveryId
 * @param {*} inventoryOrgId
 * @returns
 */
const DeliveryDetails = (deliveryId: string, inventoryOrgId: string, username: string): string => {
  return `SELECT
  wv.delivery_id,
  mv.request_number,
  case when wnd.attribute11 = upper('${username}') then 1
       when wnd.attribute11 <> upper('${username}') then 3
            else 2 end seq,  
  SOURCE_HEADER_NUMBER ORDER_NUMBER,
  SOURCE_LINE_NUMBER SO_LINE,
  mv.LINE_NUMBER MO_LINE_NUMBER,
  mv.inventory_item_id,
  wv.move_order_line_id,
  wv.SOURCE_LINE_ID,
  wv.source_header_id,
  XXMB_UTILITY_PKG.ITEM_NUMBER (mv.inventory_item_id,mv.organization_id) ITEM,
  XXMB_UTILITY_PKG.ITEM_DESC (mv.inventory_item_id,mv.organization_id) DESCRIPTION,
  XXMB_UTILITY_PKG.ITEM_SERIAL (mv.inventory_item_id,mv.organization_id) ITEM_TYPE,
  XX_DEMAND_TYPE_CATEGORY_FUNC('CATEGORY',WV.DELIVERY_ID,mv.ORGANIZATION_ID) ITEM_CATEGORY,
  -- XXMB_UTILITY_PKG.ITEM_ONHAND(mv.inventory_item_id,mv.organization_id) ONHAND_QTY,
  mmtt.TRANSACTION_QUANTITY REQUESTED_QUANTITY,
  mmtt.PRIMARY_QUANTITY REMAINING_QUANTITY,
  XXMB_UTILITY_PKG.mo_save(wv.move_order_line_id,${inventoryOrgId},mmtt.transaction_temp_id) status,
  UOM_CODE UOM,
  wv.move_order_line_id,
  mmtt.move_order_header_id,
  mmtt.transaction_temp_id,
  mmtt.transaction_header_id,
  Decode(mmtt.attribute15,'SAVE',mmtt.TRANSACTION_QUANTITY,'INCOMPLETE',mmtt.TRANSACTION_QUANTITY,NULL) picked_qty,
  milk.subinventory_code,
  milk.concatenated_segments source_loc,
  count(wv.SOURCE_LINE_ID)  OVER (PARTITION BY wv.delivery_id ) lines,
  sum(mmtt.TRANSACTION_QUANTITY) over (PARTITION BY wv.delivery_id) UNITS,
  milk.inventory_location_id,
  decode(min(OOLA.PROMISE_DATE) OVER (PARTITION BY WV.DELIVERY_ID),NULL,
         min(OOLA.REQUEST_DATE)OVER (PARTITION BY WV.DELIVERY_ID),
         min(OOLA.PROMISE_DATE)OVER (PARTITION BY WV.DELIVERY_ID)) promise_date
  FROM
  MTL_TXN_REQUEST_LINES_V mv,
  WSH_DELIVERABLES_V wv,
  wsh_new_deliveries wnd,
  mtl_material_transactions_temp mmtt,
  mtl_item_locations_kfv milk,
  oe_order_headers_all ooha,
  oe_order_lines_all oola
WHERE  
  mv.organization_id = wv.organization_id
  and wnd.delivery_id= wv.delivery_id
  and mmtt.move_order_line_id= wv.move_order_line_id
  and milk.inventory_location_id = mmtt.locator_id
  AND wv.CONTAINER_FLAG = 'N'
  AND wv.SOURCE_CODE = 'OE'
  AND wv.RELEASED_STATUS = 'S'
  AND mv.TXN_SOURCE_LINE_DETAIL_ID = wv.DELIVERY_LINE_ID
--  and mmtt.transaction_temp_id = 69125711
  AND mv.organization_id = ${inventoryOrgId}
  and wv.source_header_id = ooha.header_id
  and ooha.header_id = oola.header_id
  and wv.org_id = ooha.org_id
  and wv.source_line_id = oola.line_id
  AND wv.delivery_id = ${deliveryId}
  AND -1 = -1
  AND (  mv.move_order_type = 3
        AND mv.line_status IN (3, 7, 9))
ORDER BY mv.REQUEST_NUMBER,mv.LINE_NUMBER`;
  // return `SELECT
  //                   request_number,
  //                   SOURCE_HEADER_NUMBER ORDER_NUMBER,
  //                   SOURCE_LINE_NUMBER SO_LINE,
  //                   mv.inventory_item_id,
  //                   wv.move_order_line_id,
  //                   SOURCE_LINE_ID,
  //                   XXMB_UTILITY_PKG.ITEM_NUMBER (mv.inventory_item_id,mv.organization_id) ITEM,
  //                   XXMB_UTILITY_PKG.ITEM_DESC (mv.inventory_item_id,mv.organization_id) DESCRIPTION,
  //                   XXMB_UTILITY_PKG.ITEM_SERIAL (mv.inventory_item_id,mv.organization_id) ITEM_TYPE,
  //                   XX_DEMAND_TYPE_CATEGORY_FUNC('CATEGORY',WV.DELIVERY_ID,mv.ORGANIZATION_ID) ITEM_CATEGORY,
  //                   -- XXMB_UTILITY_PKG.ITEM_ONHAND(mv.inventory_item_id,mv.organization_id) ONHAND_QTY,
  //                   QUANTITY REQUESTED_QUANTITY,
  //                   (CASE WHEN mv.QUANTITY_DELIVERED IS  NULL THEN
  //                   mv.QUANTITY ELSE (mv.QUANTITY- mv.QUANTITY_DELIVERED)END) REMAINING_QUANTITY,
  //                   XXMB_UTILITY_PKG.mo_save(move_order_line_id,${inventoryOrgId}) status
  //                   ,UOM_CODE UOM,move_order_line_id,
  //                   (select  move_order_header_id from mtl_material_transactions_temp where move_order_line_id= wv.move_order_line_id) move_order_header_id,
  //                   (select  transaction_temp_id from mtl_material_transactions_temp where move_order_line_id= wv.move_order_line_id) transaction_temp_id,
  //                   (select  transaction_header_id from mtl_material_transactions_temp where move_order_line_id= wv.move_order_line_id) transaction_header_id,
  //                   (SELECT Decode(attribute15,'SAVE',TRANSACTION_QUANTITY,NULL) from mtl_material_transactions_temp where move_order_line_id= wv.move_order_line_id) picked_qty,
  //                   (SELECT  (SELECT    segment1
  //                     || '.'
  //                     || segment2
  //                     || '.'
  //                     || segment3
  //                     || '.'
  //                     || segment4
  //                     || '.'
  //                     || segment5
  //                     || '.'
  //                     || segment6
  //                     || '.'
  //                     || segment7
  //                     || '.'
  //                     || segment8
  //                     || '.'
  //                     || segment9
  //                     || '.'
  //                     || segment10
  //             FROM MTL_ITEM_LOCATIONS
  //             WHERE inventory_location_id = mtt.locator_id) SOURCE_LOC
  //             FROM mtl_material_transactions_temp mtt
  //             WHERE mtt.ORGANIZATION_ID = ${inventoryOrgId}
  //             AND mtt.trx_source_line_id = SOURCE_LINE_ID
  //             AND ROWNUM = 1) source_loc
  //                   FROM
  //                   MTL_TXN_REQUEST_LINES_V mv,
  //                   WSH_DELIVERABLES_V wv
  //                 WHERE
  //                   mv.organization_id = wv.organization_id
  //                   AND wv.CONTAINER_FLAG = 'N'
  //                   AND wv.SOURCE_CODE = 'OE'
  //                   AND wv.RELEASED_STATUS = 'S'
  //                   AND TXN_SOURCE_LINE_DETAIL_ID = DELIVERY_LINE_ID
  //                 --         AND mtv.move_order_line_id = wv.move_order_line_id
  //                   AND mv.organization_id = ${inventoryOrgId}
  //                   AND wv.delivery_id = ${deliveryId}
  //                 --         AND wv.move_order_line_id IN (SELECT move_order_line_id FROM mtl_material_transactions_temp)
  //                   AND -1 = -1
  //                   AND (  mv.move_order_type = 3
  //                         AND mv.line_status IN (3, 7, 9))
  //                 ORDER BY REQUEST_NUMBER, MOVE_ORDER_TYPE_NAME, LINE_NUMBER
  //             `;
};

/**
 *
 * @param {*} deliveryId
 * @param {*} inventoryOrgId
 * @returns
 */
const CountBasedonDeliveryId = (deliveryId: string, inventoryOrgId: string): string => {
  return `select count(distinct SOURCE_Line_id) Lines,
  sum(REQUESTED_QUANTITY) UNITS,
  decode(min(LATEST_PICKUP_DATE),NULL,min(Date_requested),min(LATEST_PICKUP_DATE)) promise_date
from WSH_DELIVERABLES_V
where delivery_id = ${deliveryId}
AND CONTAINER_FLAG = 'N'
AND SOURCE_CODE = 'OE'
AND RELEASED_STATUS = 'S'
and organization_id = ${inventoryOrgId}     
      `;
};

/**
 *
 * @returns
 */
const UpdateLockDeliveryQuery = (deliveryId: string, username: string): string => {
  return `UPDATE WSH_NEW_DELIVERIES
      SET ATTRIBUTE11 = upper('${username}'), --FND_USER Table USER_NAME Column Name    
      LAST_UPDATE_DATE = SYSDATE, --System Date    
      LAST_UPDATED_BY = (SELECT USER_ID FROM FND_USER WHERE USER_NAME = upper('${username}')) --FND_USER Table USER_ID Column Name    
      WHERE DELIVERY_ID = ${deliveryId}    
      AND ATTRIBUTE11 is NULL`;
};

const UpdateUnLockDeliveryQuery = (deliveryId: string, username: string): string => {
  return `UPDATE wsh_new_deliveries
  SET attribute11 = NULL,
      last_update_date = sysdate, --System Date
      last_updated_by = created_by
  WHERE delivery_id = ${deliveryId}
  and attribute11 = upper('${username}')`;
};

/**
 *
 * @returns
 */
const ExceptionList = (): string => {
  return `SELECT LOOKUP_CODE SR_NO,
           MEANING EXCEPTION_CODE,
           DESCRIPTION EXCEPTION_DESCRIPTION
      FROM FND_LOOKUP_VALUES
      WHERE LOOKUP_TYPE = 'XXMB_WSH_BACK_ORDER_EXCEPTIONS'
       AND ENABLED_FLAG = 'Y'
      ORDER BY LOOKUP_CODE ASC
      `;
};
/**
 *
 * @param {*} mvOrderLineId
 * @returns
 */
const GetSavedSOLineDetails = (mvOrderLineId: string, transactionTempId: string): string => {
  return `SELECT
  case when MMTT.ATTRIBUTE15 is null then
        NULL
       when MMTT.ATTRIBUTE15 is not null then
            MMTT.SUBINVENTORY_CODE 
       end AS SOURCE_SUB,
  CASE when MMTT.ATTRIBUTE15 is null then
        NULL
       when MMTT.ATTRIBUTE15 is not null then
            SOU_MIL.SEGMENT1
      END AS SRC_PALLET,
 CASE when MMTT.ATTRIBUTE15 is null then
        NULL
       when MMTT.ATTRIBUTE15 is not null then
            SOU_MIL.SEGMENT2
      END AS SRC_CAGE,
 CASE when MMTT.ATTRIBUTE15 is null then
        NULL
       when MMTT.ATTRIBUTE15 is not null then
            SOU_MIL.SEGMENT3
      END AS SRC_TOTE,
 CASE when MMTT.ATTRIBUTE15 is null then
        NULL
       when MMTT.ATTRIBUTE15 is not null then 
           DES_MIL.SEGMENT1
      END AS DEST_PALLET,
  CASE when MMTT.ATTRIBUTE15 is null then
        NULL
       when MMTT.ATTRIBUTE15 is not null then 
           DES_MIL.SEGMENT2 
  END AS DEST_CAGE,
  CASE when MMTT.ATTRIBUTE15 is null then
        NULL
       when MMTT.ATTRIBUTE15 is not null then 
           DES_MIL.SEGMENT3
      END AS DEST_TOTE,
  CASE when MMTT.ATTRIBUTE15 is null then
        NULL
       when MMTT.ATTRIBUTE15 is not null then 
           MMTT.TRANSFER_SUBINVENTORY
      END TO_SUBINV,
  MMTT.ATTRIBUTE15 AS STATUS,
  CASE
      WHEN MMTT.ATTRIBUTE15 = 'SAVE' OR MMTT.ATTRIBUTE15 = 'INCOMPLETE' THEN TRANSACTION_QUANTITY
      ELSE NULL
  END AS PICKED_QUANTITY,
  SERIAL_NUMBER AS SRL_NUM,
  MMTT.ATTRIBUTE10 AS EXCEPTION_VALUE
FROM MTL_MATERIAL_TRANSACTIONS_TEMP MMTT,
    MTL_ITEM_LOCATIONS SOU_MIL,
    MTL_ITEM_LOCATIONS DES_MIL
WHERE SOU_MIL.INVENTORY_LOCATION_ID = MMTT.LOCATOR_ID
  AND DES_MIL.INVENTORY_LOCATION_ID = MMTT.TRANSFER_TO_LOCATION
  AND MOVE_ORDER_LINE_ID = ${mvOrderLineId}
AND MMTT.TRANSACTION_TEMP_ID = ${transactionTempId}`;
  // return `SELECT
  //           subinventory_code AS Source_sub,
  //           (SELECT segment1 FROM mtl_item_locations WHERE inventory_location_id = locator_id) AS src_pallet,
  //           (SELECT segment2 FROM mtl_item_locations WHERE inventory_location_id = locator_id) AS src_cage,
  //           (SELECT segment3 FROM mtl_item_locations WHERE inventory_location_id = locator_id) AS src_tote,
  //           (SELECT segment1 FROM mtl_item_locations WHERE inventory_location_id = locator_id) AS dest_pallet,
  //           (SELECT segment2 FROM mtl_item_locations WHERE inventory_location_id = locator_id) AS dest_cage,
  //           (SELECT segment3 FROM mtl_item_locations WHERE inventory_location_id = locator_id) AS dest_tote,
  //           transfer_subinventory AS to_subinv,
  //           attribute15 AS status,
  //           Decode(attribute15,'SAVE',TRANSACTION_QUANTITY,NULL) AS picked_quantity,
  //           SERIAL_NUMBER AS srl_num
  //         FROM mtl_material_transactions_temp
  //         WHERE move_order_line_id = ${mvOrderLineId}`;
};

const SaveSOLineData = (): string => {
  return `update mtl_material_transactions_temp
  set subinventory_code = :Source_sub,  
      Locator_id = (SELECT    inventory_location_id  
                FROM MTL_ITEM_LOCATIONS where segment1  
                     || '.'  
                     || segment2  
                     || '.'  
                     || segment3 = (  
                :src_pallet||'.'||nvl(:src_cage,0)||'.'||nvl(:src_tote,0)) and organization_id = :INV_ORG_ID and rownum = 1),
      transfer_subinventory = :to_subinv,  
      TRANSFER_TO_LOCATION = (SELECT    inventory_location_id  
                FROM MTL_ITEM_LOCATIONS where segment1  
                     || '.'  
                     || segment2  
                     || '.'  
                     || segment3 = (  
                :dest_pallet||'.'||nvl(:dest_cage,0)||'.'||nvl(:dest_tote,0)) and organization_id = :INV_ORG_ID and rownum = 1),
      TRANSACTION_QUANTITY = :trn_qty,  
      SERIAL_NUMBER = :Srl_Num,  
      LAST_UPDATE_DATE = SYSDATE  
      CREATION_DATE = SYSDATE  
      LAST_UPDATED_BY = :USER_ID  
      CREATED_BY = :USER_ID  
      attribute15 = 'SAVE'  
      where move_order_line_id = :Mv_order_Line_id  
      AND ORGANIZATION_ID = :INV_ORG_ID`;
};

const GetSerialNumbers = (
  inventoryOrgId: string,
  soNumber: string,
  soLineId: string,
  transactionTempId: string
): string => {
  return `SELECT 
  --	  MMTT.TRANSACTION_TEMP_ID,
--       MMTT.MOVE_ORDER_LINE_ID,
       MSNT.FM_SERIAL_NUMBER serial_number,
       MSNT.ATTRIBUTE1 ASSET_NUMBER
FROM MTL_TXN_REQUEST_LINES_V MV,
           WSH_DELIVERABLES_V WV,
           MTL_MATERIAL_TRANSACTIONS_TEMP MMTT,
           MTL_SERIAL_NUMBERS_TEMP MSNT
           WHERE MV.ORGANIZATION_ID = WV.ORGANIZATION_ID
           AND TXN_SOURCE_LINE_DETAIL_ID = DELIVERY_LINE_ID
           AND  MMTT.MOVE_ORDER_LINE_ID= WV.MOVE_ORDER_LINE_ID
           AND MMTT.TRANSACTION_TEMP_ID = MSNT.TRANSACTION_TEMP_ID
           AND MV.ORGANIZATION_ID = ${inventoryOrgId}
           AND WV.SOURCE_HEADER_NUMBER = ${soNumber}
                       AND WV.SOURCE_LINE_ID = ${soLineId}
                       AND MMTT.TRANSACTION_TEMP_ID = ${transactionTempId}
           AND -1 = -1
           AND (MV.MOVE_ORDER_TYPE = 3 AND MV.LINE_STATUS IN (3,7,9))
           ORDER BY REQUEST_NUMBER,
               MOVE_ORDER_TYPE_NAME,
               LINE_NUMBER`;
};

/**
 * Check Is Serial Number Scanned
 * @param {*} transactionTempId
 * @param {*} serialNo
 * @returns  Scanned or not
 */
const IsSerialNumberScanned = (transactionTempId: string, serialNo: string): string => {
  return `select case
  when nvl(count(*),0) > 0 then
'Already Scanned Serial Number'
  ELSE
'New scanned Serial Number'
END scanned_result
from mtl_serial_numbers_temp
where transaction_temp_id =  ${transactionTempId}
and (upper(fm_serial_number) = upper('${serialNo}') OR upper(ATTRIBUTE1) = upper('${serialNo}'))`;
  // return `select case
  //           when nvl(count(*),0) > 0 then
  //         'Already Scanned Serial Number'
  //           ELSE
  //         'New scanned Serial Number'
  //         END scanned_result
  //         from mtl_serial_numbers_temp
  //         where transaction_temp_id = ${transactionTempId}
  //         and (fm_serial_number = '${serialNo}' OR ATTRIBUTE1 = '${serialNo}')`;
};

/**
 *
 * @param {*} transactionTempId
 * @param {*} userId
 * @param {*} serialNum
 * @param {*} transactionHeaderId
 * @returns
 */
const SaveSerialNumbers = (
  transactionTempId: string,
  userId: string,
  serialNum: string,
  assetNumber: string,
  transactionHeaderId: string
): string => {
  return `insert into MTL_SERIAL_NUMBERS_TEMP 
        (transaction_temp_id,last_update_date,last_updated_by,creation_date,created_by,FM_serial_number,to_serial_number,Group_header_id,attribute1)
    values
     (${transactionTempId},sysdate,${userId},sysdate,${userId},'${serialNum}','${serialNum}',${transactionHeaderId},'${assetNumber}')`;
};

/**
 *
 * @param {*} transaction_temp_id
 * @returns
 */
const DeleteAllSerialNumbers = (transactionTempId: string): string => {
  return `delete from MTL_SERIAL_NUMBERS_TEMP where transaction_temp_id = ${transactionTempId}`;
};

/**
 *
 * @param {*} transactionTempId
 * @param {*} serialNum
 * @returns
 */
const DeleteSerialNumber = (transactionTempId: string, serialNum: string): string => {
  return ` delete from MTL_SERIAL_NUMBERS_TEMP where transaction_temp_id = ${transactionTempId} and (FM_serial_number = '${serialNum}' or attribute11='${serialNum}') `;
};

/**
 *
 * @param {*} userid
 * @param {*} toSubInv
 * @param {*} inventoryOrgId
 * @param {*} deliveryId
 * @param {*} destPallet
 * @param {*} destCage
 * @param {*} destTote
 * @param {*} pickedQty
 * @returns
 */
const DropAllItemsToSameLocation = (
  userid: string,
  toSubInv: string,
  inventoryOrgId: string,
  deliveryId: string,
  destPallet: string,
  destCage: string,
  destTote: string,
  pickedQty: string
): string => {
  return `update mtl_material_transactions_temp
    set transfer_subinventory = '${toSubInv}',
        TRANSFER_TO_LOCATION = (SELECT inventory_location_id
                  FROM MTL_ITEM_LOCATIONS where segment1
                       || '.'
                       || segment2
                       || '.'
                       || segment3 = (
                  '${destPallet}'||'.'||nvl('${destCage}','0')||'.'||nvl('${destTote}','0')) and organization_id = ${inventoryOrgId}),
        --TRANSACTION_QUANTITY = ${pickedQty},
        LAST_UPDATE_DATE = SYSDATE,
        CREATION_DATE = SYSDATE,
        LAST_UPDATED_BY = ${userid},
        CREATED_BY = ${userid},
        attribute15 = 'SAVE'
        where move_order_line_id in (select move_order_line_id from WSH_DELIVERABLES_V where delivery_id = ${deliveryId} )
        AND ORGANIZATION_ID = ${inventoryOrgId}`;
};

/**
 *
 * @param {*} userid
 * @param {*} sourceSubInv
 * @param {*} toSubInv
 * @param {*} inventoryOrgId
 * @param {*} srcPallet
 * @param {*} srcCage
 * @param {*} srcTote
 * @param {*} destPallet
 * @param {*} destCage
 * @param {*} destTote
 * @param {*} pickedQty
 * @param {*} mvOrderLineId
 * @returns
 */
const SaveSOLinePickRelease = (
  userid: string,
  sourceSubInv: string,
  toSubInv: string,
  inventoryOrgId: string,
  srcPallet: string,
  srcCage: string,
  srcTote: string,
  destPallet: string,
  destCage: string,
  destTote: string,
  pickedQty: string,
  mvOrderLineId: string,
  exceptionValue: string,
  status: string,
  transactionTempId: string
): string => {
  return `update mtl_material_transactions_temp
    set subinventory_code = '${sourceSubInv}',
        Locator_id = (SELECT    inventory_location_id
                  FROM MTL_ITEM_LOCATIONS where segment1
                       || '.'
                       || segment2
                       || '.'
                       || segment3 = (
                  '${srcPallet}' ||'.'||nvl('${srcCage}','0')||'.'||nvl('${srcTote}','0')) and organization_id = ${inventoryOrgId} and SUBINVENTORY_CODE = '${sourceSubInv}' and rownum=1),
        transfer_subinventory = '${toSubInv}',
        TRANSFER_TO_LOCATION = (SELECT    inventory_location_id
                  FROM MTL_ITEM_LOCATIONS where segment1
                       || '.'
                       || segment2
                       || '.'
                       || segment3 = (
                  '${destPallet}'||'.'||nvl('${destCage}','0')||'.'||nvl('${destTote}','0')) and organization_id = ${inventoryOrgId} and SUBINVENTORY_CODE = '${toSubInv}' and rownum=1),
        TRANSACTION_QUANTITY = ${pickedQty},
        LAST_UPDATE_DATE = SYSDATE,
        CREATION_DATE = SYSDATE,
        LAST_UPDATED_BY = ${userid},
        CREATED_BY = ${userid},
        attribute10 = nvl('${exceptionValue}',NULL),
        attribute15 = '${status}'
        where move_order_line_id = ${mvOrderLineId}
        and TRANSACTION_TEMP_ID = ${transactionTempId}
        AND ORGANIZATION_ID = ${inventoryOrgId}`;
};
/**
 *
 * @param {*} deliveryId
 * @param {*} inventoryOrgId
 * @param {*} userid
 * @returns
 */
const PickConfirm = (): string => {
  //   BEGIN
  //   XXMB_GENERATE_LPN_PROC(:p_organization_id, :p_container_item, :p_lpn_number, :p_error);
  //   COMMIT;
  // END;
  return `BEGIN 
  XXMB_UTILITY_PKG.xxmb_pick_confirm_Del(:p_deliveryId, :p_inventoryOrgId, :p_userid, :releaseStatus);
  COMMIT; END; `;
};

const ValidateSerialNo = (
  subInventory: string,
  inventoryOrgId: string,
  inventoryItemId: string,
  scanValue: string,
  sourceLocatorId: string
): string => {
  // let appendQuery;
  // if (scanType === "A") {
  //   appendQuery = `and attribute1 = '${scanValue}'`;
  // } else if (scanType === "S") {
  //   appendQuery = `and serial_number = '${scanValue}'`;
  // } else {
  //   appendQuery = `and serial_number = '${scanValue}'`;
  // }
  return `select mut.serial_number,mut.attribute1 asset_number
  from MTL_UNIT_TRANSACTIONS_ALL_V mut
  where UPPER(mut.SUBINVENTORY_CODE) = upper('${subInventory}')
    and mut.LOCATOR_ID = ${sourceLocatorId}
    and mut.ORGANIZATION_ID = ${inventoryOrgId}
    and (upper(mut.serial_number) = upper('${scanValue}') OR upper(mut.attribute1) = upper('${scanValue}'))
    and mut.inventory_item_id =${inventoryItemId}
    and not exists (select 1
                      from MTL_SERIAL_NUMBERS_TEMP msnt
                     where msnt.FM_serial_number = mut.serial_number)`;

  // return `select serial_number,attribute1 asset_number
  // from MTL_UNIT_TRANSACTIONS_ALL_V
  // where UPPER(SUBINVENTORY_CODE) = upper('${subInventory}')
  //   and ORGANIZATION_ID = ${inventoryOrgId}
  //   and (serial_number = '${scanValue}' OR attribute1 = '${scanValue}')
  //   and inventory_item_id =${inventoryItemId}`;
};

/**
 * PICK.WF13
 * Created on 21-Nov-2023 By Surendra
 * Validate the On Hand Qty for the following Parameters
 * @param {*} inventoryOrgId
 * @param {*} subInventoryCode
 * @param {*} inventoryItemId
 * @param {*} pallet
 * @param {*} cage
 * @param {*} tote
 */
const ValidateOnhandQty = (
  inventoryOrgId: string,
  subInventoryCode: string,
  inventoryItemId: string,
  pallet: string,
  cage: string,
  tote: string,
  reqQty: string
): string => {
  return `SELECT 
          --SUBINVENTORY_CODE,
          LOCATOR_ID AS "SOURCE_LOCATOR_ID",
          ONHAND_QUANTITY
          --PALLET,CAGE,TOTE 
          FROM
          (SELECT
          MOQD.SUBINVENTORY_CODE,
          MOQD.LOCATOR_ID,
          SUM(MOQD.TRANSACTION_QUANTITY) ONHAND_QUANTITY,
          MILKFV.SEGMENT1 PALLET,
          MILKFV.SEGMENT2 CAGE,
          MILKFV.SEGMENT3 TOTE
          FROM
          APPS.MTL_SYSTEM_ITEMS_B           MSIB,
          APPS.MTL_ONHAND_QUANTITIES_DETAIL MOQD,
          APPS.MTL_ITEM_LOCATIONS_KFV       MILKFV
          WHERE
          MSIB.ORGANIZATION_ID = ${inventoryOrgId}
          AND MSIB.INVENTORY_ITEM_ID = MOQD.INVENTORY_ITEM_ID
          AND MSIB.ORGANIZATION_ID = MOQD.ORGANIZATION_ID
          AND MOQD.SUBINVENTORY_CODE = '${subInventoryCode}'
          AND MILKFV.INVENTORY_LOCATION_ID = MOQD.LOCATOR_ID
          AND MSIB.INVENTORY_ITEM_ID = ${inventoryItemId}
          AND UPPER(MILKFV.SEGMENT1) LIKE UPPER('%'|| '${pallet}' || '%')
          AND UPPER(MILKFV.SEGMENT2) LIKE UPPER(nvl(('%'|| '${cage}' || '%'),'0'))
          AND UPPER(MILKFV.SEGMENT3) LIKE UPPER(nvl(('%'|| '${tote}' || '%'),'0'))
          GROUP BY
          MOQD.LOCATOR_ID,
          MOQD.SUBINVENTORY_CODE,
          MILKFV.SEGMENT1,
          MILKFV.SEGMENT2,
          MILKFV.SEGMENT3)
          WHERE ONHAND_QUANTITY >= ${reqQty}`;
};

const LocatorAvailable = ({
  destPallet,
  destCage,
  destTote,
  inventoryOrgId,
}): string => {
  return `
  SELECT  inventory_location_id
                  FROM MTL_ITEM_LOCATIONS where segment1
                       || '.'
                       || segment2
                       || '.'
                       || segment3 = (
                  '${destPallet}'||'.'||nvl(${
    destCage ? `'${destCage}'` : null
  },'0')||'.'||nvl(${
    destTote ? `'${destTote}'` : null
  },'0')) and organization_id = ${inventoryOrgId}
  `;
};

const CreateLocator = ({
  inventoryOrgId,
  deliveryId,
  orderHeaderId,
  lineId,
  userId,
  subInventoryCode,
  pallet,
  cage,
  tote,
}): string => {
  return `
  DECLARE
     l_locator number;
     l_error varchar2(2500);
  BEGIN
    XXMB_CREATE_STOCK_LOCATOR_PROC (${inventoryOrgId},${deliveryId},${orderHeaderId},${lineId},${userId},'${subInventoryCode}','${pallet}',${
    cage ? `'${cage}'` : `'0'`
  },${tote ? `'${tote}'` : `'0'`},l_locator,l_error);
    dbms_output.put_line('Locator ID '||l_locator||' Error '||l_error);
  END;
  `;
};

/**
 * PICK.WF13
 * Created on 22-Nov-2023 By Surendra
 * @param {*} pallet
 * @param {*} cage
 * @param {*} tote
 * @param {*} inventoryOrgId
 * @returns
 */
const IsSourceLocatorIdExists = (pallet: string, cage: string, tote: string, inventoryOrgId: string): string => {
  return `SELECT inventory_location_id
  FROM MTL_ITEM_LOCATIONS where segment1
       || '.'
       || segment2
       || '.'
       || segment3 = (
  '${pallet}'||'.'||nvl('${cage}','0')||'.'||nvl('${tote}','0')) and organization_id = ${inventoryOrgId}`;
};


  
module.exports = {
    Dashboard,
    Search,
    List,
    Filter,
    SearchByDeliveryId,
    SearchByDemandType,
    SearchByItemDescription,
    SearchBySalesOrder,
    SearchPickDetails,
    DeliveryDetails,
    CountBasedonDeliveryId,
    SourceSubInventoryDetails,
    DestinationSubInventoryDetails,
    PalleteLOV,
    CageLOV,
    ToteLOV,
    GetLinesCountBasedOnSO,
    GetSoLinesDetails,
    UpdateAutoPopulateFullPickQty,
    PickupLookupPalletCageTote,
    UpdateLockDeliveryQuery,
    ExceptionList,
    GetSavedSOLineDetails,
    UpdateUnLockDeliveryQuery,
    SaveSOLineData,
    GetSerialNumbers,
    IsSerialNumberScanned,
    SaveSerialNumbers,
    DeleteAllSerialNumbers,
    DeleteSerialNumber,
    DropAllItemsToSameLocation,
    SaveSOLinePickRelease,
    PickConfirm,
    ValidateSerialNo,
    ValidateOnhandQty,
    LocatorAvailable,
    CreateLocator,
    IsSourceLocatorIdExists,
};
  