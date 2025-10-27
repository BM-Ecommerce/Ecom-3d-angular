import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

interface ApiCommonParams {
  api_url: string;
  api_key: string;
  api_name: string;
  recipeid?: string;
  productid?: string;
  [key: string]: any;
}

interface ApiResponse {
  success: boolean;
  data: any;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = 'http://localhost/wordpress/wp-content/plugins/blindmatrix-v4-api/api.php';

  constructor(private http: HttpClient) {}

  private constructUrl(base: string, endpoint: string): string {
    return `${base.replace(/\/+$/, '')}/${endpoint.replace(/^\/+/, '')}`;
  }

  private getHeaders(api_name: string, api_key: string): HttpHeaders {
    return new HttpHeaders({
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'companyname': api_name,
      'platform': 'Ecommerce',
      'Ecommercekey': api_key,
      'activity': JSON.stringify({
        ipaddress: '',
        location: '',
        devicenameversion: '',
        browsernameversion: ''
      })
    });
  }

  callApi(
    method: string,
    passData: string,
    payload: any = null,
    node: boolean = false,
    appointment: boolean = false,
    api_url: string,
    api_key: string,
    api_name: string
  ): Observable<ApiResponse> {
    let url = '';
    if (appointment) {
      url = this.constructUrl(`${api_url}/api/public/api`, passData);
    } else if (node) {
      url = this.constructUrl(`${api_url}/nodeapi/`, passData);
    } else {
      url = this.constructUrl(`${api_url}/api/public/api`, passData);
    }

    const headers = this.getHeaders(api_name, api_key);

    switch (method.toUpperCase()) {
      case 'POST':
        return this.http.post<ApiResponse>(url, payload || {}, { headers }).pipe(
          catchError(this.handleError)
        );
      case 'PUT':
        return this.http.put<ApiResponse>(url, payload || {}, { headers }).pipe(
          catchError(this.handleError)
        );
      case 'GET':
      default:
        let params = new HttpParams();
        if (payload) {
          Object.keys(payload).forEach(key => {
            if (payload[key] !== undefined && payload[key] !== null) {
              params = params.set(key, payload[key].toString());
            }
          });
        }
        return this.http.get<ApiResponse>(url, { headers, params }).pipe(
          catchError(this.handleError)
        );
    }
  }

  private handleError(error: any): Observable<never> {
    console.error('API Error:', error);
    return throwError(() => new Error('An error occurred. Please try again later.'));
  }
  
  getProductData(params: ApiCommonParams): Observable<ApiResponse> {
    const { api_url, api_key, api_name, product_id, ...payload } = params;
    const passData = `getproductsdetails/${product_id}`;
    return this.callApi('GET', passData, payload, false, false, api_url, api_key, api_name);
  }

  getRecipeList(params: ApiCommonParams): Observable<ApiResponse> {
    const { api_url, api_key, api_name, product_id, ...payload } = params;
    const passData = `products/recipe/list/${product_id}`;
    return this.callApi('GET', passData, payload, true, false, api_url, api_key, api_name);
  }

  getFractionList(params: ApiCommonParams): Observable<ApiResponse> {
    const { api_url, api_key, api_name, product_id, ...payload } = params;
    const passData = `appSetup/fractionlist/${product_id}`;
    return this.callApi('GET', passData, payload, false, false, api_url, api_key, api_name);
  }

  getProductParameters(params: ApiCommonParams): Observable<ApiResponse> {
    const { api_url, api_key, api_name, recipeid, ...payload } = params;
    if (!recipeid) {
      return throwError(() => new Error('recipeid is required'));
    }
    const passData = `products/fields/withdefault/list/${recipeid}/1/0`;
    return this.callApi('GET', passData, payload, true, false, api_url, api_key, api_name);
  }
  getminandmax(params: ApiCommonParams,colorid:string,unittype:number,pricegroup:number): Observable<ApiResponse> {
    const { api_url, api_key, api_name, recipeid,product_id,category } = params;
    if (!recipeid) {
      return throwError(() => new Error('recipeid is required'));
    }
    const payload = {
      width: "0",
      drop: "0",
      unittype: unittype,
      mode: "both",
      pricegroup: pricegroup,
      colorid: colorid,
      fieldtypeid: category,
      fabriciddual: "",
      coloriddual: "",
      pricegroupdual: "",
      productid: product_id
    };

    const passData = `orderitems/check/widthdrop/minandmax/`;
    return this.callApi('POST', passData, payload, true, false, api_url, api_key, api_name);
  }
  getFractionData(params: ApiCommonParams,faction_value: any): Observable<ApiResponse> {
    const { api_url, api_key, api_name, recipeid,product_id, ...payload } = params;
    if (!recipeid) {
      return throwError(() => new Error('recipeid is required'));
    }
    const passData = `appSetup/fractionlist/${product_id}/-1/${faction_value}`;
    return this.callApi('GET', passData, payload, false, false, api_url, api_key, api_name);
  }
  addToCart(formData: any, productId: string, apiUrl: string, cartproductName: string,priceData: any,vatpercentage: number, vatName: string,currenturl: string,productName: string,categoryId: number,visualizerImage?: string): Observable<ApiResponse> {
    let body = new HttpParams()
      .set('action', 'add_to_cart')
      .set('product_id', productId)
      .set('form_data', JSON.stringify(formData))
      .set('cart_product_name', cartproductName)
      .set('pricedata', JSON.stringify(priceData))
      .set('vatpercentage', vatpercentage)
      .set('vatname', vatName)
      .set('currenturl', currenturl)
      .set('product_name', productName)
      .set('category_id', categoryId);
    if (visualizerImage) {
      body = body.set('visualizer_image', visualizerImage);
    }
    const endpoint = '/wp-content/plugins/blindmatrix-v4-hub/api.php';
    const requestUrl = `${apiUrl.replace(/\/+$/, '')}${endpoint}`;

    return this.http.post<ApiResponse>(requestUrl, body.toString(), {
      headers: new HttpHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' })
    }).pipe(
      catchError(this.handleError)
    );
  }
 calculateRules(
  params: ApiCommonParams,
  width: any = "",
  drop: any = "",
  unittype: any,
  supplierid: any,
  widthfieldtypeid: any,
  dropfieldtypeid: any,
  pricegroup: any,
  vatprice: any,
  optiondata: any,
  fabricid: any = "",
  colorid: any = "",
  orderitemdata: any= "",
  mode: number = 0
) {
  const { api_url, api_key, api_name, recipeid, product_id } = params;

  const payload = {
    vatpercentage: vatprice,
    blindopeningwidth: [],
    recipeid: recipeid,
    productid: product_id,
    orderitemdata: orderitemdata,
    supplierid: supplierid,
    mode: "pricetableprice",
    width: width,
    drop: drop,
    pricegroup: [pricegroup],
    pricegroupdual: "",
    pricegroupmulticurtain: [],
    customertype: 4,
    optiondata: optiondata,
    unittype: unittype,
    orderitemqty: 1,
    jobid: null,
    customerid: "",
    rulemode: mode,
    productionoveridedata: [],
    widthfieldtypeid: widthfieldtypeid,
    dropfieldtypeid: dropfieldtypeid,
    overridetype: 1,
    overrideprice: "",
    fabricid: fabricid,
    fabriciddual: "",
    colorid: colorid,
    coloriddual: "",
    subfabricid: "",
    subcolorid: "",
    fabricmulticurtain: [],
    colormulticurtain: []
  };

  const passData = `orderitems/calculate/rules`;
  return this.callApi('POST', passData, payload, true, false, api_url, api_key, api_name);
}

  getOptionlist(
    params: ApiCommonParams,
    level: number = 0,
    fieldtype: number,
    fabriccolor: number = 0,
    fieldid: number,
    filter: any
  ): Observable<ApiResponse> {
    const { api_url, api_key, api_name, recipeid, product_id, ...rest } = params;

    if (!recipeid) {
      return throwError(() => new Error('recipeid is required'));
    }

    const payload = {
      filterids: filter,
      productionformulalist: [],
      productid: product_id || null,
    };
   
   
   
    const passData = `products/get/fabric/options/list/${recipeid}/${level}/0/${fieldtype}/${fabriccolor}/${fieldid}/?page=1&perpage=150`;
 console.log(passData);
    return this.callApi('POST', passData, payload, true, false, api_url, api_key, api_name);
  }

  filterbasedlist(
    params: ApiCommonParams,
    level: string = "",
    fabriccolor: string = "",
    fieldid: string = "",
    pricegroup: any = "",
    colorid: any ="",
    fabricid: any ="",
    unittype:any =""
  ): Observable<ApiResponse> {
    const { api_url, api_key, api_name, product_id,category } = params;
    const payload = {
      changedfieldtypeid: "",
      colorid: colorid,
      coloriddual: "",
      customertype: "4",
      drop: null,
      fabricid: fabricid,
      fabriciddual: "",
      fieldtypeid: category,
      lineitemselectedvalues: [],
      numFraction: null,
      orderItemId: "",
      orderitemselectedvalues: "",
      pricegroup: pricegroup,
      pricegroupdual: "",
      productid: product_id,
      selectedfieldids: "",
      selectedvalues: {
        supplierarray: [],
        pricegrouparray: []
      },
      subcolorid: "",
      subfabricid: "",
      supplier: "",
      unittype: unittype,
      width: null,
      level: level,
      fabriccolor: fabriccolor,
      fieldid: fieldid
    };
   
    const passData = `products/fields/filterbasedongeneraldata`;
    return this.callApi('POST', passData, payload, true, false, api_url, api_key, api_name);
  }
  
  sublist(
    params: ApiCommonParams,
    level: number = 2,
    fieldtype: number,
    optionlinkid:any,
    selectedvalue:any,
    masterparentfieldid: any,
    supplierid: any,
  ): Observable<ApiResponse> {
    const { api_url, api_key, api_name, recipeid,product_id } = params;
      const payload = {
      supplierid: supplierid,
      productid:product_id, 
      optionid: [selectedvalue],
      subfieldoptionlinkid: [optionlinkid],
      productionformulalist: [],
      orderitemselectedvalues: {
        [masterparentfieldid]: [selectedvalue]
      }
    };
    const passData = `products/fields/list/0/${recipeid}/${level}/${fieldtype}/${masterparentfieldid}`;
   
    return this.callApi('POST', passData, payload, true, false, api_url, api_key, api_name);
  }
  getVat( params: ApiCommonParams) {
      const { api_url, api_key, api_name, recipeid,product_id } = params;
      const payload = {
          productid: product_id,
          };
      const passData = `/job/get/vat/percentage/orderitem`;
      return this.callApi('POST', passData, payload, true, false, api_url, api_key, api_name);
    }
  getPrice( params: ApiCommonParams ,
    width:any ="",
    drop:any = "",
    unittype:any,
    supplierid:any,
    widthfieldtypeid:any,
    dropfieldtypeid:any,
    pricegroup:any,
    vatprice:any,
    optiondata:any,
    fabricid:any = "",
    colorid:any = "",
    netpricecomesfrom:any = "",
    costpricecomesfrom:any = "",
    productionmaterialcostprice:any = "",
    productionmaterialnetprice:any = "",
    productionmaterialnetpricewithdiscount:any = "",
    ) {
    const { api_url, api_key, api_name, recipeid,product_id } = params;
    const payload = {
        blindopeningwidth: [],
        productid: product_id,
        supplierid: supplierid,
        mode: "pricetableprice",
        width: width,
        drop: drop,
        pricegroup: [pricegroup],
        customertype: 4,
        optiondata: optiondata,
        unittype: unittype,
        orderitemqty: 1,
        jobid: null,
        overridetype: 1,
        overrideprice: "",
        overridevalue: null,
        vatpercentage: vatprice,
        costpriceoverride: 0,
        costpriceoverrideprice: 0,
        orderitemcostprice: 0,
        productionmaterialcostprice: productionmaterialcostprice,
        materialFormulaPrice: 0,
        productionmaterialnetprice: productionmaterialnetprice,
        productionmaterialnetpricewithdiscount: productionmaterialnetpricewithdiscount,
        overridepricevalue: 0,
        getpricegroupprice: 0,
        rulescostpricecomesfrom: costpricecomesfrom,
        rulesnetpricecomesfrom:netpricecomesfrom,
        fabricfieldtype: "",
        widthfieldtypeid: widthfieldtypeid,
        dropfieldtypeid: dropfieldtypeid,
        colorid: colorid,
        reportpriceresults: [],
        fabricid: fabricid,
        orderid: "",
        customerid: "",
        fabriciddual: [],
        fabricmulticurtain: [],
        coloriddual: [],
        subfabricid: "",
        subcolorid: "",
        pricegroupdual: "",
        pricegroupmulticurtain: []
      };
     const passData = `orderitems/calculate/option/price`;
     return this.callApi('POST', passData, payload, true, false, api_url, api_key, api_name);
  }
}