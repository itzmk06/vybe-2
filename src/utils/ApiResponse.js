class ApiResponse{
    constructor(statusCode,message="success",data){
        super(message);
        this.statusCode=statusCode;
        this.data=data;
        this.success=statusCode<400;
    }
};

export default ApiResponse;



